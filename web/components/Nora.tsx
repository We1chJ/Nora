"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { domToJpeg } from "modern-screenshot";
import { NoraBubble, NoraFace } from "./NoraBubble";
import "@/app/nora.css";

// Nora works like a real phone overlay: all it gets from the website is a screenshot and where the
// person tapped. It never reads the page's code, labels or state.

type Rect = { x: number; y: number; width: number; height: number };
type Reply = { message: string; highlight: Rect | null; done: boolean };
type Mode = "idle" | "listening" | "thinking" | "guiding" | "done";
type ChatItem = { from: "nora" | "you"; text: string };
// Where to draw the highlight, in the overlay's own coordinates.
type Box = { top: number; left: number; width: number; height: number; layerHeight: number };

// The Web Speech API isn't in TypeScript's DOM types; this is the part Nora uses.
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

function getRecognition(): RecognitionCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const MAX_LOG = 30;
const clip = (text: string) => (text.length > 590 ? `${text.slice(0, 589)}…` : text);
const isNoraUi = (n: EventTarget | null) => n instanceof Element && !!n.closest("[data-nora-ui]");

// Take a picture of the phone, leaving out Nora's own bubble, cards and highlight.
async function screenshot(phone: HTMLElement) {
  const r = phone.getBoundingClientRect();
  const image = await domToJpeg(phone, {
    quality: 0.7,
    scale: 1,
    backgroundColor: "#ffffff",
    filter: (n) => !(n instanceof Element && n.hasAttribute("data-nora-ui")),
    features: { restoreScrollPosition: true },
  });
  return { image, width: Math.round(r.width), height: Math.round(r.height) };
}

type Props = {
  phoneRef: RefObject<HTMLDivElement | null>;
  // Still passed by Demo.tsx but no longer used: Nora takes its picture of the whole phone.
  screenRef?: RefObject<HTMLDivElement | null>;
};

export function Nora({ phoneRef }: Props) {
  const [mode, setMode] = useState<Mode>("idle");
  const [active, setActive] = useState(false);
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState("");
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [heard, setHeard] = useState("");
  const [typed, setTyped] = useState("");
  const [micProblem, setMicProblem] = useState("");
  const [box, setBox] = useState<Box | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  // Nothing here is saved: the session lives in memory until it ends or the page reloads.
  const activeRef = useRef(false);
  const goal = useRef("");
  const log = useRef<string[]>([]);
  const requestId = useRef(0);
  const inflight = useRef<AbortController | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const heardRef = useRef("");
  const submitOnEnd = useRef(false);
  const chatLogRef = useRef<HTMLDivElement>(null);

  const setSession = (on: boolean) => {
    activeRef.current = on;
    setActive(on);
  };

  const ask = useCallback(
    async (event: string) => {
      const phone = phoneRef.current;
      if (!phone) return;

      log.current = [...log.current, clip(event)].slice(-MAX_LOG);
      const id = ++requestId.current;
      inflight.current?.abort();
      const controller = new AbortController();
      inflight.current = controller;
      setMode("thinking");
      setError("");
      setBox(null);

      try {
        const shot = await screenshot(phone);
        if (id !== requestId.current) return;
        const res = await fetch("/api/nora", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goal: goal.current, log: log.current, ...shot }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Nora returned ${res.status}`);
        const data = (await res.json()) as Reply;
        if (id !== requestId.current) return;

        const h = data.highlight;
        const highlighted = h ? ` and highlighted the area x=${Math.round(h.x)}, y=${Math.round(h.y)}, ${Math.round(h.width)} wide, ${Math.round(h.height)} tall` : "";
        log.current = [...log.current, clip(`Nora said: "${data.message}"${highlighted}`)].slice(-MAX_LOG);
        setReply(data);
        // The screenshot covers the phone's outer edge; the overlay may sit slightly inside it.
        const layer = layerRef.current;
        if (h && layer && h.width > 0 && h.height > 0) {
          const p = phone.getBoundingClientRect();
          const l = layer.getBoundingClientRect();
          setBox({ left: h.x - (l.left - p.left), top: h.y - (l.top - p.top), width: h.width, height: h.height, layerHeight: l.height });
        }
        setChat((c) => [...c, { from: "nora", text: data.message }]);
        if (data.done) {
          activeRef.current = false;
          setActive(false);
          setMode("done");
        } else {
          setMode("guiding");
        }
      } catch {
        if (id !== requestId.current) return;
        setError("Sorry, I couldn't reach Nora just now. Tap the Nora button to try again.");
        setMode("guiding");
      }
    },
    [phoneRef],
  );

  const submitQuestion = (raw: string) => {
    const text = raw.trim().slice(0, 300);
    setTyped("");
    setHeard("");
    setChatOpen(false);
    if (!text) {
      setMode(activeRef.current ? "guiding" : "idle");
      return;
    }
    if (!activeRef.current) {
      goal.current = text;
      log.current = [];
      setChat([]);
      setReply(null);
      setSession(true);
    }
    setChat((c) => [...c, { from: "you", text }]);
    ask(`Person asked: "${text}"`);
  };

  const startListening = () => {
    heardRef.current = "";
    setHeard("");
    setTyped("");
    setMicProblem("");
    setChatOpen(false);
    setMode("listening");

    const Ctor = getRecognition();
    if (!Ctor) {
      setMicProblem("Voice isn't available in this browser. Please type instead, or tap the microphone on your keyboard.");
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      heardRef.current = text;
      setHeard(text);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setMicProblem("The microphone is blocked. You can type instead.");
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        setMicProblem("I couldn't hear that. You can try again or type instead.");
      }
    };
    rec.onend = () => {
      recognition.current = null;
      if (submitOnEnd.current) {
        submitOnEnd.current = false;
        submitQuestion(heardRef.current);
      }
    };
    recognition.current = rec;
    try {
      rec.start();
    } catch {
      recognition.current = null;
      setMicProblem("I couldn't start the microphone. You can type instead.");
    }
  };

  const stopListening = () => {
    if (recognition.current) {
      submitOnEnd.current = true;
      recognition.current.stop();
    } else {
      submitQuestion(heardRef.current || typed);
    }
  };

  const cancelRecognition = () => {
    submitOnEnd.current = false;
    recognition.current?.abort();
    recognition.current = null;
  };

  const submitTyped = (e: FormEvent) => {
    e.preventDefault();
    cancelRecognition();
    submitQuestion(typed);
  };

  const cancelListening = () => {
    cancelRecognition();
    setMode(activeRef.current ? "guiding" : "idle");
  };

  const stopHelping = () => {
    requestId.current++;
    inflight.current?.abort();
    cancelRecognition();
    setSession(false);
    setMode("idle");
    setReply(null);
    setBox(null);
    setError("");
    setChatOpen(false);
  };

  // While helping, every tap, scroll or bit of typing is a signal to look at the screen again.
  // Like a real overlay, Nora only learns where the tap was, not what was tapped.
  useEffect(() => {
    const phone = phoneRef.current;
    if (!active || !phone) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending: string[] = [];
    const queue = (what: string, delay: number) => {
      setBox(null); // the screen is changing, so the old highlight may be in the wrong place
      if (pending[pending.length - 1] !== what) pending.push(what);
      clearTimeout(timer);
      timer = setTimeout(() => {
        const events = pending;
        pending = [];
        ask(events.join(", then "));
      }, delay);
    };

    const onClick = (e: MouseEvent) => {
      if (isNoraUi(e.target) || (e.target instanceof Element && e.target.closest("select"))) return;
      const r = phone.getBoundingClientRect();
      queue(`Person tapped at x=${Math.round(e.clientX - r.left)}, y=${Math.round(e.clientY - r.top)}`, 700);
    };
    const onInput = (e: Event) => {
      if (isNoraUi(e.target)) return;
      if (e.target instanceof HTMLSelectElement) queue("Person picked an option from a list", 700);
      else if (e.target instanceof HTMLInputElement && e.target.type !== "checkbox") queue("Person typed on the keyboard", 1800);
      else if (e.target instanceof HTMLTextAreaElement) queue("Person typed on the keyboard", 1800);
    };
    const onScroll = (e: Event) => {
      if (isNoraUi(e.target)) return;
      queue("Person scrolled the screen", 900);
    };

    phone.addEventListener("click", onClick, true);
    phone.addEventListener("input", onInput, true);
    phone.addEventListener("scroll", onScroll, true);
    return () => {
      clearTimeout(timer);
      phone.removeEventListener("click", onClick, true);
      phone.removeEventListener("input", onInput, true);
      phone.removeEventListener("scroll", onScroll, true);
    };
  }, [active, ask, phoneRef]);

  useEffect(() => {
    chatLogRef.current?.scrollTo({ top: chatLogRef.current.scrollHeight });
  }, [chat, chatOpen]);

  const highlight = active && mode === "guiding" ? box : null;
  const cardAtTop = !!highlight && highlight.top + highlight.height / 2 > highlight.layerHeight * 0.55;

  let card = null;
  if (mode === "listening") {
    card = (
      <div className="nora-card listening">
        <p className="nora-card-title">{micProblem ? "⌨️ Type your question" : "🎤 Listening…"}</p>
        {micProblem ? (
          <p className="nora-note">{micProblem}</p>
        ) : (
          <>
            <p className="nora-message">{heard || "Tell me what you need help with."}</p>
            <p className="nora-note">Tap the red Stop button when you finish talking.</p>
          </>
        )}
        <form className="nora-type-row" onSubmit={submitTyped}>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={micProblem ? "Type here…" : "Or type here…"}
            maxLength={300}
            autoFocus={!!micProblem}
            aria-label="Type your question for Nora"
          />
          <button className="btn btn-primary" type="submit">
            Send
          </button>
        </form>
        <button className="link-btn" onClick={cancelListening}>
          Cancel
        </button>
      </div>
    );
  } else if (mode === "thinking") {
    card = (
      <div className="nora-card">
        <div className="nora-card-head">
          <NoraFace mood="thinking" />
          <strong>Nora</strong>
        </div>
        <p className="nora-message thinking">
          Looking at your screen<span className="dots" />
        </p>
      </div>
    );
  } else if ((mode === "guiding" || mode === "done") && (reply || error)) {
    card = (
      <div className={`nora-card${mode === "done" ? " done" : ""}`}>
        <div className="nora-card-head">
          <NoraFace mood={mode === "done" ? "done" : "guiding"} />
          <strong>{mode === "done" ? "All done!" : "Nora"}</strong>
        </div>
        <p className="nora-message">{error || reply?.message}</p>
        {mode === "done" ? (
          <button className="btn btn-primary btn-wide" onClick={stopHelping}>
            Close
          </button>
        ) : (
          <div className="nora-card-actions">
            <button className="btn" onClick={() => setChatOpen(true)}>
              💬 Ask a question
            </button>
            <button className="btn" onClick={stopHelping}>
              Stop helping
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="nora-layer" data-nora-ui ref={layerRef}>
      {highlight && (
        <div
          className="nora-spotlight"
          style={{ top: highlight.top - 6, left: highlight.left - 6, width: highlight.width + 12, height: highlight.height + 12 }}
        />
      )}

      {card && <div className={`nora-card-slot ${cardAtTop ? "top" : "bottom"}`}>{card}</div>}

      {chatOpen && (
        <div className="nora-chat" role="region" aria-label="Chat with Nora">
          <header className="nora-chat-head">
            <strong>Chat with Nora</strong>
            <button className="icon-btn" aria-label="Close chat" onClick={() => setChatOpen(false)}>
              ✕
            </button>
          </header>
          <div className="nora-chat-log" ref={chatLogRef}>
            {chat.map((c, i) => (
              <p key={i} className={`nora-chat-msg ${c.from}`}>
                {c.text}
              </p>
            ))}
          </div>
          <form className="nora-type-row" onSubmit={submitTyped}>
            <button type="button" className="icon-btn round" aria-label="Talk instead of typing" onClick={startListening}>
              🎤
            </button>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type a question…" maxLength={300} aria-label="Question for Nora" />
            <button className="btn btn-primary" type="submit">
              Send
            </button>
          </form>
        </div>
      )}

      <NoraBubble mood={mode} listening={mode === "listening"} onTap={mode === "listening" ? stopListening : startListening} />
    </div>
  );
}
