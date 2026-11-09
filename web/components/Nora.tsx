"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { domToJpeg } from "modern-screenshot";
import { NoraBubble, NoraFace } from "./NoraBubble";
import "@/app/nora.css";

// Nora works like a real phone overlay: all it gets from the website is a screenshot and where the
// person tapped. It never reads the page's code, labels or state.

type Rect = { x: number; y: number; width: number; height: number };
type Reply = { message: string; highlight: Rect | null; needs_answer: boolean; done: boolean };
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
const HOLD_MS = 350; // a press on the mic longer than this is hold-to-talk; shorter is tap-to-toggle
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tapToTalk, setTapToTalk] = useState(false);
  const [typed, setTyped] = useState("");
  const [heard, setHeard] = useState("");
  const [micProblem, setMicProblem] = useState("");
  const [box, setBox] = useState<Box | null>(null);
  const [keyboard, setKeyboard] = useState(0);
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
  const micPress = useRef<{ start: number; startedHere: boolean } | null>(null);
  const chatLogRef = useRef<HTMLDivElement>(null);

  const setSession = (on: boolean) => {
    activeRef.current = on;
    setActive(on);
  };
  const restingMode = (): Mode => (activeRef.current ? "guiding" : "idle");

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
          setSession(false);
          setMode("done");
          setSheetOpen(false);
        } else {
          setMode("guiding");
          // A question for the person opens the conversation so they can answer right away;
          // a step to take keeps the screen clear with a short card instead.
          setSheetOpen(data.needs_answer);
        }
      } catch {
        if (id !== requestId.current) return;
        setError("Sorry, I couldn't reach Nora just now. Please try again.");
        setMode("guiding");
      }
    },
    [phoneRef],
  );

  const submitQuestion = (raw: string) => {
    const text = raw.trim().slice(0, 300);
    setTyped("");
    setHeard("");
    if (!text) return;
    if (!activeRef.current) {
      goal.current = text;
      log.current = [];
      setChat([]);
      setReply(null);
      setSession(true);
    }
    setChat((c) => [...c, { from: "you", text }]);
    // Close the sheet so the screen is clear while Nora looks at it.
    setSheetOpen(false);
    ask(`Person asked: "${text}"`);
  };

  const startListening = () => {
    heardRef.current = "";
    setHeard("");
    setMicProblem("");
    setTapToTalk(false);

    const Ctor = getRecognition();
    if (!Ctor) {
      setMicProblem("Voice isn't available here. Please type instead, or use the microphone on your keyboard.");
      return false;
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
      const send = submitOnEnd.current;
      submitOnEnd.current = false;
      setMode(restingMode());
      if (!send) return;
      if (heardRef.current.trim()) submitQuestion(heardRef.current);
      else setMicProblem((m) => m || "I didn't catch that. Try again, or type instead.");
    };
    recognition.current = rec;
    try {
      rec.start();
    } catch {
      recognition.current = null;
      setMicProblem("I couldn't start the microphone. You can type instead.");
      return false;
    }
    setMode("listening");
    return true;
  };

  // Stop listening and send what was heard.
  const finishListening = () => {
    if (recognition.current) {
      submitOnEnd.current = true;
      recognition.current.stop();
    } else {
      setMode(restingMode());
    }
  };

  const cancelRecognition = () => {
    submitOnEnd.current = false;
    recognition.current?.abort();
    recognition.current = null;
  };

  // The mic works two ways: hold it while talking and let go to send, or tap once to start
  // and tap again to send.
  const onMicDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    try {
      // Keep receiving the release even if the finger slides off the button.
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    if (recognition.current) {
      micPress.current = { start: Date.now(), startedHere: false };
    } else if (startListening()) {
      micPress.current = { start: Date.now(), startedHere: true };
    }
  };
  const onMicUp = () => {
    const press = micPress.current;
    micPress.current = null;
    if (!press) return;
    if (!press.startedHere || Date.now() - press.start >= HOLD_MS) finishListening();
    else setTapToTalk(true);
  };
  const onMicKey = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Keyboard and screen-reader activation arrive as a click with no pointer press.
    if (e.detail !== 0) return;
    if (recognition.current) finishListening();
    else if (startListening()) setTapToTalk(true);
  };

  const submitTyped = (e: FormEvent) => {
    e.preventDefault();
    cancelRecognition();
    submitQuestion(typed);
  };

  const openSheet = () => {
    setMicProblem("");
    setSheetOpen(true);
  };

  const closeSheet = () => {
    cancelRecognition();
    setMode((m) => (m === "listening" ? restingMode() : m));
    setSheetOpen(false);
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
    setSheetOpen(false);
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

  // Keep the sheet above the on-screen keyboard, which phones draw over the page.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!sheetOpen || !vv) return;
    const update = () => setKeyboard(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      setKeyboard(0);
    };
  }, [sheetOpen]);

  useEffect(() => {
    chatLogRef.current?.scrollTo({ top: chatLogRef.current.scrollHeight });
  }, [chat, sheetOpen]);

  const listening = mode === "listening";
  const highlight = active && mode === "guiding" ? box : null;
  const cardAtTop = !!highlight && highlight.top + highlight.height / 2 > highlight.layerHeight * 0.55;

  let card = null;
  if (!sheetOpen && (mode === "guiding" || mode === "done") && (reply || error)) {
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
            <button className="btn" onClick={openSheet}>
              💬 Reply
            </button>
            <button className="btn" onClick={stopHelping}>
              Stop helping
            </button>
          </div>
        )}
      </div>
    );
  }

  const hint = micProblem
    ? micProblem
    : listening
      ? tapToTalk
        ? "Listening… tap the red button when you're done."
        : "Listening… let go to send."
      : "Type, or hold the microphone and talk.";

  return (
    <div className="nora-layer" data-nora-ui ref={layerRef}>
      {highlight && (
        <div
          className="nora-spotlight"
          style={{ top: highlight.top - 6, left: highlight.left - 6, width: highlight.width + 12, height: highlight.height + 12 }}
        />
      )}

      {card && <div className={`nora-card-slot ${cardAtTop ? "top" : "bottom"}`}>{card}</div>}

      {sheetOpen && (
        <section className="nora-sheet" style={{ bottom: keyboard }} aria-label="Talk with Nora">
          <header className="nora-sheet-head">
            <NoraFace mood={listening ? "listening" : "guiding"} size={36} />
            <strong>Nora</strong>
            {active && (
              <button className="nora-sheet-stop" onClick={stopHelping}>
                Stop helping
              </button>
            )}
            <button className="nora-sheet-close" aria-label="Close" onClick={closeSheet}>
              <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </header>

          <div className="nora-sheet-log" ref={chatLogRef}>
            {chat.length === 0 && <p className="nora-msg nora">Hi, I&apos;m Nora. What would you like help with?</p>}
            {chat.map((c, i) => (
              <p key={i} className={`nora-msg ${c.from}`}>
                {c.text}
              </p>
            ))}
          </div>

          <form className="nora-composer" onSubmit={submitTyped}>
            <input
              value={listening ? heard : typed}
              onChange={(e) => setTyped(e.target.value)}
              readOnly={listening}
              placeholder={listening ? "Listening…" : "Type a message…"}
              maxLength={300}
              enterKeyHint="send"
              aria-label="Message for Nora"
            />
            {typed.trim() && !listening && (
              <button className="nora-send" type="submit" aria-label="Send">
                Send
              </button>
            )}
            <button
              type="button"
              className={`nora-mic${listening ? " on" : ""}`}
              aria-label={listening ? "Stop and send" : "Talk to Nora"}
              aria-pressed={listening}
              onPointerDown={onMicDown}
              onPointerUp={onMicUp}
              onPointerCancel={onMicUp}
              onContextMenu={(e) => e.preventDefault()}
              onClick={onMicKey}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
                <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </form>
          <p className={`nora-hint${micProblem ? " problem" : ""}`} aria-live="polite">
            {hint}
          </p>
        </section>
      )}

      <NoraBubble mood={mode} listening={false} thinking={mode === "thinking"} hidden={sheetOpen} onTap={openSheet} />
    </div>
  );
}
