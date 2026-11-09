"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export type FaceMood = "idle" | "listening" | "thinking" | "guiding" | "done";

const INK = "#3A2A12";

// The peekaboo face. `look` shifts the whole face and pupils sideways (-1 = left, 1 = right).
export function NoraFace({ mood = "idle", look = 0, size = 30 }: { mood?: FaceMood; look?: number; size?: number }) {
  const shift = look * 16;
  const pupilX = look * 3 + (mood === "thinking" ? 2 : 0);
  const pupilY = mood === "thinking" ? -5 : 2;
  return (
    <svg className={`nora-face ${mood}`} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="50" fill="#F2A33A" />
      <g style={{ transform: `translateX(${shift}px)`, transition: "transform 0.35s ease" }}>
        {mood === "done" ? (
          <>
            <path d="M29 47Q38 36 47 47" stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d="M53 47Q62 36 71 47" stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <g className="nora-eyes">
            <ellipse cx="38" cy="45" rx="9.5" ry="12" fill="#fff" />
            <ellipse cx="62" cy="45" rx="9.5" ry="12" fill="#fff" />
            <circle cx={38 + pupilX} cy={45 + pupilY} r="5" fill={INK} />
            <circle cx={62 + pupilX} cy={45 + pupilY} r="5" fill={INK} />
          </g>
        )}
        <circle cx="27" cy="62" r="4.5" fill="#E8782F" />
        <circle cx="73" cy="62" r="4.5" fill="#E8782F" />
        {mood === "listening" ? (
          <ellipse cx="50" cy="67" rx="5" ry="6" fill={INK} />
        ) : mood === "thinking" ? (
          <path d="M44 66H56" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />
        ) : (
          <path
            d={mood === "done" ? "M40 61Q50 73 60 61" : "M43 64Q50 70 57 64"}
            stroke={INK}
            strokeWidth="3.6"
            fill="none"
            strokeLinecap="round"
          />
        )}
      </g>
    </svg>
  );
}

const SIZE = 68;
const MARGIN = 10;
const PEEK = 0.45; // share of the bubble left showing when tucked into an edge
const DRAG_START = 8; // px of movement before a press counts as a drag

type Spot = { side: "left" | "right"; y: number; tucked: boolean };

type Props = {
  mood: FaceMood;
  listening: boolean;
  thinking: boolean;
  onTap: () => void;
};

// A floating bubble: tap it, drag it anywhere, let go and it snaps to the nearest side.
// Push it against an edge and it tucks in, with its face peeking out.
export function NoraBubble({ mood, listening, thinking, onTap }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [spot, setSpot] = useState<Spot>({ side: "right", y: -1, tucked: false });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [placed, setPlaced] = useState(false); // no slide-in animation on first appearance
  const press = useRef<{ px: number; py: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  // Track the size of the layer the bubble floats in.
  useEffect(() => {
    const layer = wrapRef.current?.parentElement;
    if (!layer) return;
    const measure = () => setArea({ w: layer.clientWidth, h: layer.clientHeight });
    measure();
    const settle = setTimeout(() => setPlaced(true), 100);
    const ro = new ResizeObserver(measure);
    ro.observe(layer);
    return () => {
      clearTimeout(settle);
      ro.disconnect();
    };
  }, []);

  const minY = 40;
  const maxY = Math.max(minY, area.h - SIZE - 70);
  const restY = spot.y < 0 ? maxY : Math.min(Math.max(spot.y, minY), maxY);

  const restX =
    spot.side === "left"
      ? spot.tucked
        ? -SIZE * (1 - PEEK)
        : MARGIN
      : spot.tucked
        ? area.w - SIZE * PEEK
        : area.w - SIZE - MARGIN;

  const x = drag ? drag.x : restX;
  const y = drag ? drag.y : restY;

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    press.current = { px: e.clientX, py: e.clientY, x, y, moved: false };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const p = press.current;
    if (!p) return;
    const dx = e.clientX - p.px;
    const dy = e.clientY - p.py;
    if (!p.moved && Math.hypot(dx, dy) < DRAG_START) return;
    p.moved = true;
    setDrag({
      x: Math.min(Math.max(p.x + dx, -SIZE * 0.7), area.w - SIZE * 0.3),
      y: Math.min(Math.max(p.y + dy, minY), maxY),
    });
  };

  const onPointerUp = () => {
    const p = press.current;
    press.current = null;
    if (!p?.moved || !drag) return;
    // Swallow the click the browser may fire at the end of a drag, but only that one.
    suppressClick.current = true;
    setTimeout(() => (suppressClick.current = false), 0);
    const side = drag.x + SIZE / 2 < area.w / 2 ? "left" : "right";
    // Pushed at least a quarter of the way past the edge: tuck it in.
    const tucked = side === "left" ? drag.x < -SIZE * 0.25 : drag.x > area.w - SIZE * 0.75;
    setSpot({ side, y: drag.y, tucked });
    setDrag(null);
  };

  const onClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    // A tucked bubble pops back out and starts helping in the same tap.
    if (spot.tucked) setSpot((s) => ({ ...s, tucked: false }));
    onTap();
  };

  // Tucked, the face slides toward the screen and peeks; otherwise it looks inward a little.
  const inward = spot.side === "left" ? 1 : -1;
  const look = drag ? 0 : spot.tucked ? inward : mood === "idle" ? 0 : inward * 0.3;

  return (
    <div
      ref={wrapRef}
      className={`nora-bubble-wrap${drag ? " dragging" : ""}${placed ? "" : " still"}`}
      style={{ left: x, top: y, visibility: area.w ? "visible" : "hidden" }}
    >
      <button
        className={`nora-bubble${listening ? " listening" : ""}${spot.tucked && !drag ? " tucked" : ""}`}
        aria-label={listening ? "Stop listening" : "Ask Nora for help"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onClick}
      >
        <NoraFace mood={mood} look={look} size={SIZE - 6} />
      </button>
      {listening && !drag && <span className={`nora-stop-pill ${spot.side}`}>Tap me to stop</span>}
      {thinking && !drag && (
        // A thought cloud floating up from the bubble, toward the middle of the screen.
        <div className={`nora-thought ${spot.side}${y < 110 ? " below" : ""}`} role="status" aria-label="Nora is looking at your screen">
          <span className="nora-thought-puff small" />
          <span className="nora-thought-puff mid" />
          <span className="nora-thought-cloud">
            <i />
            <i />
            <i />
          </span>
        </div>
      )}
    </div>
  );
}
