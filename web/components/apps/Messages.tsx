import { useState } from "react";
import type { ChatMessage, Photo, Thread } from "@/lib/data";
import { AppHeader, PhotoTile } from "../ui";
import type { Route } from "../Demo";

type Props = {
  route: Route;
  go: (route: Route) => void;
  threads: Thread[];
  photos: Photo[];
  send: (threadId: string, message: Omit<ChatMessage, "id" | "fromMe">) => void;
  toast: (text: string) => void;
};

export function MessagesApp({ route, go, threads, photos, send, toast }: Props) {
  const thread = threads.find((t) => t.id === route.id);

  if (route.view === "thread" && thread) {
    return <Conversation key={thread.id} thread={thread} photos={photos} go={go} send={send} toast={toast} />;
  }

  return (
    <div className="app" data-nora-screen="Messages – list of conversations">
      <AppHeader title="Messages" backLabel="Back to home screen" onBack={() => go({ app: "home", view: "home" })} />
      <div className="app-body flush">
        {threads.map((t) => {
          const last = t.messages[t.messages.length - 1];
          const lastText = last.text ?? "Photo";
          return (
            <button
              key={t.id}
              className="thread-row"
              data-nora={`conversation-${t.id}`}
              data-nora-label={`Conversation with ${t.name}. Last message: "${lastText}"`}
              onClick={() => go({ app: "messages", view: "thread", id: t.id })}
            >
              <span className="avatar big">{t.avatar}</span>
              <span className="email-row-text">
                <span className="email-row-from">{t.name}</span>
                <span className="email-row-preview">{lastText}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Conversation({
  thread,
  photos,
  go,
  send,
  toast,
}: {
  thread: Thread;
  photos: Photo[];
  go: (route: Route) => void;
  send: Props["send"];
  toast: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const [attached, setAttached] = useState<string[]>([]);
  const [sheet, setSheet] = useState<"menu" | "picker" | null>(null);
  const [picking, setPicking] = useState<string[]>([]);

  const photoById = (id: string) => photos.find((p) => p.id === id);
  const photoNames = (ids: string[]) => ids.map((id) => photoById(id)?.title ?? "photo").join(", ");
  const canSend = text.trim().length > 0 || attached.length > 0;

  const doSend = () => {
    if (!canSend) return;
    send(thread.id, { text: text.trim() || undefined, photoIds: attached.length ? attached : undefined });
    setText("");
    setAttached([]);
  };

  return (
    <div className="app" data-nora-screen={`Messages – conversation with ${thread.name}`}>
      <AppHeader title={thread.name} backLabel="Back to all conversations" onBack={() => go({ app: "messages", view: "list" })} />
      <div className="app-body chat-body">
        {thread.messages.map((m) => (
          <div
            key={m.id}
            className={`bubble ${m.fromMe ? "me" : "them"}`}
            data-nora={`message-${m.id}`}
            data-nora-label={`${m.fromMe ? "You sent" : `${thread.name} said`}: ${m.photoIds ? `${m.photoIds.length} photo(s) (${photoNames(m.photoIds)}) ` : ""}${m.text ? `"${m.text}"` : ""}`}
          >
            {m.photoIds && (
              <span className="bubble-photos">
                {m.photoIds.map((id) => {
                  const p = photoById(id);
                  return p ? <PhotoTile key={id} emoji={p.emoji} bg={p.bg} size="sm" /> : null;
                })}
              </span>
            )}
            {m.text && <span>{m.text}</span>}
          </div>
        ))}
      </div>
      <div className="composer">
        {attached.length > 0 && (
          <div className="attachments" data-nora="attached-photos" data-nora-label={`Attached, ready to send: ${photoNames(attached)}`}>
            {attached.map((id) => {
              const p = photoById(id);
              return (
                p && (
                  <span key={id} className="attachment">
                    <PhotoTile emoji={p.emoji} bg={p.bg} size="sm" />
                    <button
                      className="remove-attachment"
                      data-nora={`remove-attachment-${id}`}
                      aria-label={`Remove ${p.title}`}
                      onClick={() => setAttached((a) => a.filter((x) => x !== id))}
                    >
                      ×
                    </button>
                  </span>
                )
              );
            })}
          </div>
        )}
        <div className="composer-row">
          <button className="icon-btn round" data-nora="add-button" aria-label="Add photos or files (plus sign)" onClick={() => setSheet("menu")}>
            +
          </button>
          <input
            className="composer-input"
            data-nora="message-box"
            aria-label="Message box"
            placeholder="Text message"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoComplete="off"
          />
          <button className="icon-btn round send" data-nora="send-button" aria-label="Send (arrow)" disabled={!canSend} onClick={doSend}>
            ↑
          </button>
        </div>
      </div>

      {sheet === "menu" && (
        <div className="sheet-backdrop" onClick={() => setSheet(null)}>
          <div className="sheet" role="dialog" aria-label="Add to message" onClick={(e) => e.stopPropagation()}>
            <button
              className="sheet-item"
              data-nora="attach-photos"
              onClick={() => {
                setPicking([]);
                setSheet("picker");
              }}
            >
              🖼️ Photos
            </button>
            <button className="sheet-item" data-nora="attach-camera" onClick={() => toast("The camera isn't part of this practice phone.")}>
              📷 Camera
            </button>
            <button className="sheet-item" data-nora="attach-location" onClick={() => toast("Location isn't part of this practice phone.")}>
              📍 Location
            </button>
            <button className="sheet-item muted" data-nora="sheet-cancel" onClick={() => setSheet(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {sheet === "picker" && (
        <div className="picker" role="dialog" aria-label="Choose photos to send">
          <header className="app-header">
            <button className="text-btn" data-nora="picker-cancel" onClick={() => setSheet(null)}>
              Cancel
            </button>
            <h1 className="app-title">Choose Photos</h1>
            <button
              className="text-btn strong"
              data-nora="picker-add"
              data-nora-label={`Add (${picking.length} selected)`}
              disabled={picking.length === 0}
              onClick={() => {
                setAttached((a) => [...a, ...picking.filter((id) => !a.includes(id))]);
                setSheet(null);
              }}
            >
              Add{picking.length ? ` (${picking.length})` : ""}
            </button>
          </header>
          <div className="photo-grid">
            {photos.map((p) => {
              const isPicked = picking.includes(p.id);
              return (
                <button
                  key={p.id}
                  className={`photo-cell${isPicked ? " selected" : ""}`}
                  data-nora={`pick-photo-${p.id}`}
                  data-nora-label={`Photo: ${p.title}, ${p.date}${isPicked ? " (selected)" : ""}`}
                  onClick={() => setPicking((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))}
                >
                  <PhotoTile emoji={p.emoji} bg={p.bg} />
                  {isPicked && <span className="check">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
