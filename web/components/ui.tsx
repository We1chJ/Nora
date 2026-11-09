import type { ReactNode } from "react";

export function AppHeader({
  title,
  backLabel,
  onBack,
  right,
}: {
  title: string;
  backLabel?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <header className="app-header">
      {onBack ? (
        <button className="icon-btn" data-nora="back-button" aria-label={backLabel ?? "Back"} onClick={onBack}>
          ‹
        </button>
      ) : (
        <span className="icon-spacer" />
      )}
      <h1 className="app-title">{title}</h1>
      <div className="header-right">{right}</div>
    </header>
  );
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  confirmId,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  body?: string;
  confirmLabel: string;
  confirmId: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="dialog" aria-label={title}>
        <h2 data-nora="dialog-title">{title}</h2>
        {body && <p data-nora="dialog-message">{body}</p>}
        <div className="dialog-actions">
          <button className="btn" data-nora="dialog-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className={danger ? "btn btn-danger" : "btn btn-primary"} data-nora={confirmId} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PhotoTile({ emoji, bg, size = "md" }: { emoji: string; bg: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span className={`photo-tile photo-${size}`} style={{ background: bg }} aria-hidden>
      {emoji}
    </span>
  );
}
