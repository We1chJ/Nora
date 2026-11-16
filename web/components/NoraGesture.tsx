"use client";

import type { CSSProperties } from "react";

export type Gesture = "none" | "tap" | "long_press" | "type" | "scroll_down" | "scroll_up" | "swipe_left" | "swipe_right" | "drag";
type Point = { x: number; y: number };
type Box = { left: number; top: number; width: number; height: number };
export type Zone = { left: number; top: number; right: number; bottom: number };

type Props = {
  gesture: Gesture;
  box: Box | null; // the highlighted thing, in overlay coordinates
  dragTo: Point | null; // where a drag ends, in overlay coordinates
  label: string; // a short name for the highlighted thing, shown on an arrow pointing at it
  area: { w: number; h: number };
};

const CAPTIONS: Partial<Record<Gesture, string>> = {
  long_press: "Press and hold",
  type: "Tap here, then type",
  scroll_down: "Slide your finger up",
  scroll_up: "Slide your finger down",
  swipe_left: "Swipe to the left",
  swipe_right: "Swipe to the right",
  drag: "Hold, then slide",
};

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

// Where each part of a gesture goes. Shared with Nora's card, so the card can keep out of the way.
function layoutGesture({ gesture, box, dragTo, label, area }: Props) {
  const { w, h } = area;
  const cx = box ? box.left + box.width / 2 : w / 2;
  const cy = box ? box.top + box.height / 2 : h / 2;

  // Where the finger starts and ends.
  let from: Point = { x: cx, y: cy };
  let to: Point | null = null;
  if (gesture === "scroll_down" || gesture === "scroll_up") {
    const top = box ? box.top + box.height * 0.25 : h * 0.25;
    const bottom = box ? box.top + box.height * 0.75 : h * 0.55;
    const x = box ? cx : w * 0.5;
    // To see what's further down, the finger slides up the screen, and the other way round.
    from = { x, y: gesture === "scroll_down" ? bottom : top };
    to = { x, y: gesture === "scroll_down" ? top : bottom };
  } else if (gesture === "swipe_left" || gesture === "swipe_right") {
    const left = box ? box.left + box.width * 0.2 : w * 0.2;
    const right = box ? box.left + box.width * 0.8 : w * 0.8;
    from = { x: gesture === "swipe_left" ? right : left, y: cy };
    to = { x: gesture === "swipe_left" ? left : right, y: cy };
  } else if (gesture === "drag" && dragTo) {
    to = dragTo;
  }

  // The AI's label sits above the highlight (or below it near the top), with an arrow to it.
  const labelAbove = !!box && box.top > 80;
  const labelAt = label && box ? { x: clamp(cx, 90, w - 90), y: labelAbove ? box.top - 10 : box.top + box.height + 10 } : null;

  // The built-in caption goes on the other side of the highlight, or beside a moving finger.
  const caption = CAPTIONS[gesture];
  let captionAt: Point | null = null;
  if (caption) {
    if (to) {
      const vertical = Math.abs(to.y - from.y) > Math.abs(to.x - from.x);
      // For a scroll, the caption sits above the top of the finger's path.
      captionAt = vertical
        ? { x: clamp(from.x, 100, w - 100), y: clamp(Math.min(from.y, to.y) - 60, 60, h - 140) }
        : { x: clamp((from.x + to.x) / 2, 100, w - 100), y: clamp((from.y + to.y) / 2 + 64, 60, h - 140) };
    } else if (box) {
      const below = labelAbove || box.top <= 80;
      captionAt = {
        x: clamp(cx, 100, w - 100),
        y: below ? clamp(box.top + box.height + 60, 60, h - 140) : clamp(box.top - 60, 60, h - 140),
      };
    }
  }

  return { from, to, labelAbove, labelAt, caption, captionAt };
}

// The parts of the screen a gesture uses (finger, arrow, label, caption), with a little room around them.
export function gestureZones(props: Props): Zone[] {
  if (props.gesture === "none" && !props.label) return [];
  const { from, to, labelAbove, labelAt, captionAt } = layoutGesture(props);
  const pad = 16;
  const zones: Zone[] = [];
  // The finger at each point it passes, hanging down about 56px from its tip. A path is a chain of
  // small areas, so a diagonal arrow doesn't claim the whole rectangle around it.
  const steps = to ? Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 40)) : 0;
  for (let i = 0; i <= steps; i++) {
    const x = to ? from.x + ((to.x - from.x) * i) / steps : from.x;
    const y = to ? from.y + ((to.y - from.y) * i) / steps : from.y;
    zones.push({ left: x - 30 - pad, right: x + 30 + pad, top: y - 24 - pad, bottom: y + 56 + pad });
  }
  if (labelAt) {
    zones.push(
      labelAbove
        ? { left: labelAt.x - 100, right: labelAt.x + 100, top: labelAt.y - 64, bottom: labelAt.y }
        : { left: labelAt.x - 100, right: labelAt.x + 100, top: labelAt.y, bottom: labelAt.y + 64 },
    );
  }
  if (captionAt) zones.push({ left: captionAt.x - 120, right: captionAt.x + 120, top: captionAt.y - 30, bottom: captionAt.y + 30 });
  return zones;
}

// Shows the movement Nora is asking for: an animated finger, an arrow along the way it moves,
// and a short caption. Everything here is drawing only; it never blocks taps.
export function NoraGesture(props: Props) {
  const { gesture, label, area } = props;
  if (gesture === "none" && !label) return null;
  const { w, h } = area;
  const { from, to, labelAbove, labelAt, caption, captionAt } = layoutGesture(props);

  const handClass = to ? "move" : gesture === "long_press" ? "hold" : gesture === "none" ? "" : "tap";
  const handStyle = {
    left: from.x,
    top: from.y,
    "--dx": `${to ? to.x - from.x : 0}px`,
    "--dy": `${to ? to.y - from.y : 0}px`,
  } as CSSProperties;

  // The arrow stops a little short of each end so the finger and arrowhead don't overlap.
  let arrow = null;
  if (to) {
    const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    const ux = (to.x - from.x) / len;
    const uy = (to.y - from.y) / len;
    const a = { x: from.x + ux * 10, y: from.y + uy * 10 };
    const b = { x: to.x - ux * 6, y: to.y - uy * 6 };
    arrow = (
      <svg className="nora-gesture-arrow" width={w} height={h} aria-hidden="true">
        <defs>
          <marker id="nora-arrowhead" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="#f2a33a" stroke="#fff" strokeWidth="1.2" />
          </marker>
        </defs>
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fff" strokeWidth="13" strokeLinecap="round" />
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#f2a33a" strokeWidth="8" strokeLinecap="round" markerEnd="url(#nora-arrowhead)" />
      </svg>
    );
  }

  return (
    <div className="nora-gesture" aria-hidden="true">
      {arrow}
      {gesture === "long_press" && (
        <svg className="nora-hold-ring" style={{ left: from.x - 34, top: from.y - 34 }} width="68" height="68">
          <circle cx="34" cy="34" r="28" fill="none" stroke="#fff" strokeWidth="9" />
          <circle cx="34" cy="34" r="28" fill="none" stroke="#f2a33a" strokeWidth="6" pathLength="100" />
        </svg>
      )}
      {(gesture === "tap" || gesture === "type") && <span className="nora-ripple" style={{ left: from.x, top: from.y }} />}
      {handClass && (
        <span className={`nora-hand ${handClass}`} style={handStyle}>
          👆
        </span>
      )}
      {labelAt && (
        <div className={`nora-label ${labelAbove ? "above" : "below"}`} style={{ left: labelAt.x, top: labelAt.y }}>
          <span>{label}</span>
        </div>
      )}
      {caption && captionAt && (
        <div className="nora-caption" style={{ left: captionAt.x, top: captionAt.y }}>
          {gesture === "type" ? "⌨️ " : ""}
          {caption}
        </div>
      )}
    </div>
  );
}
