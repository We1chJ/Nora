import { useState, type ReactNode } from "react";
import type { Photo } from "@/lib/data";
import type { ChatMessage, Thread } from "@/lib/messages";
import { PhotoTile } from "../ui";
import type { Route } from "../Demo";
import "@/app/messages.css";

// An iPhone-style Messages app: conversation list, new message, conversations with photos,
// and a share sheet that Photos opens to send pictures from there.

export type SendMessage = (threadId: string, message: Pick<ChatMessage, "text" | "photoIds">) => void;

type Props = {
  route: Route;
  go: (route: Route) => void;
  threads: Thread[];
  photos: Photo[];
  send: SendMessage;
  markRead: (threadId: string) => void;
  toast: (text: string) => void;
};

const visibleThreads = (threads: Thread[]) => threads.filter((t) => t.messages.length > 0).sort((a, b) => b.order - a.order);
const lastPreview = (t: Thread, photos: Photo[]) => {
  const last = t.messages[t.messages.length - 1];
  if (last.text) return last.text;
  const n = last.photoIds?.length ?? 0;
  const title = photos.find((p) => p.id === last.photoIds?.[0])?.title;
  return n > 1 ? `${n} Photos` : title ? `Photo: ${title}` : "Photo";
};

export function MessagesApp({ route, go, threads, photos, send, markRead, toast }: Props) {
  const thread = threads.find((t) => t.id === route.id);
  const toList = () => go({ app: "messages", view: "list" });

  if (route.view === "thread" && thread) {
    return <Conversation key={thread.id} thread={thread} photos={photos} onBack={toList} send={send} toast={toast} />;
  }

  if (route.view === "new") {
    return (
      <div className="app im" data-nora-screen="Messages – new message">
        <NewMessageHeader onCancel={toList} />
        <ToField
          threads={threads}
          onPick={(t) => {
            markRead(t.id);
            go({ app: "messages", view: "thread", id: t.id });
          }}
        />
      </div>
    );
  }

  return <ConversationList threads={threads} photos={photos} go={go} markRead={markRead} toast={toast} />;
}

function Avatar({ thread, size = "md" }: { thread: Thread; size?: "sm" | "md" }) {
  return (
    <span className={`im-avatar ${size}${thread.isGroup ? " group" : ""}`} aria-hidden>
      {thread.initials}
    </span>
  );
}

function ConversationList({
  threads,
  photos,
  go,
  markRead,
  toast,
}: {
  threads: Thread[];
  photos: Photo[];
  go: Props["go"];
  markRead: Props["markRead"];
  toast: Props["toast"];
}) {
  const [query, setQuery] = useState("");
  const shown = visibleThreads(threads).filter((t) => t.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="app im" data-nora-screen="Messages – list of conversations">
      <header className="im-list-header">
        <div className="im-toolbar">
          <button className="im-link" data-nora="edit-button" onClick={() => toast("Editing the list isn't part of this practice phone.")}>
            Edit
          </button>
          <button className="im-icon-btn" data-nora="compose-button" aria-label="Write a new message (pencil and paper)" onClick={() => go({ app: "messages", view: "new" })}>
            <ComposeIcon />
          </button>
        </div>
        <h1 className="im-large-title">Messages</h1>
        <label className="im-search">
          <span aria-hidden>🔍</span>
          <input data-nora="search-box" placeholder="Search" aria-label="Search conversations" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
        </label>
      </header>
      <div className="app-body flush im-list">
        {shown.length === 0 && <p className="im-empty">No results</p>}
        {shown.map((t) => (
          <button
            key={t.id}
            className="im-row"
            data-nora={`conversation-${t.id}`}
            data-nora-label={`Conversation with ${t.name}${t.unread ? " (unread)" : ""}. Last message: "${lastPreview(t, photos)}"`}
            onClick={() => {
              markRead(t.id);
              go({ app: "messages", view: "thread", id: t.id });
            }}
          >
            <span className={`im-unread${t.unread ? " on" : ""}`} aria-hidden />
            <Avatar thread={t} />
            <span className="im-row-text">
              <span className="im-row-top">
                <strong>{t.name}</strong>
                <span className="im-row-time">
                  {t.time} <span aria-hidden>›</span>
                </span>
              </span>
              <span className="im-row-preview">{lastPreview(t, photos)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ComposeIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
      <path d="M17.5 3.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
    </svg>
  );
}

function NewMessageHeader({ onCancel }: { onCancel: () => void }) {
  return (
    <header className="im-sheet-header">
      <span />
      <h1>New Message</h1>
      <button className="im-link" data-nora="cancel-new-message" onClick={onCancel}>
        Cancel
      </button>
    </header>
  );
}

/** "To:" box with contact suggestions, like starting a new message on an iPhone. */
function ToField({ threads, picked, onPick, onClear }: { threads: Thread[]; picked?: Thread | null; onPick: (t: Thread) => void; onClear?: () => void }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const people = [...threads]
    .filter((t) => !t.isGroup || t.messages.length > 0)
    .filter((t) => !q || t.name.toLowerCase().split(/\s+/).some((w) => w.startsWith(q)) || t.name.toLowerCase().startsWith(q))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <div className="im-to">
        <span className="im-to-label">To:</span>
        {picked ? (
          <button className="im-chip" data-nora="recipient-chip" data-nora-label={`Sending to ${picked.name} (tap to change)`} onClick={onClear}>
            {picked.name}
          </button>
        ) : (
          <input
            data-nora="to-box"
            aria-label="To: type a name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            autoCapitalize="words"
          />
        )}
      </div>
      {!picked && (
        <div className="app-body flush im-contacts">
          <p className="im-contacts-title">{q ? "Contacts" : "All Contacts"}</p>
          {people.length === 0 && <p className="im-empty">No contacts named &ldquo;{query}&rdquo;</p>}
          {people.map((t) => (
            <button key={t.id} className="im-contact" data-nora={`contact-${t.id}`} data-nora-label={`Contact: ${t.name}`} onClick={() => onPick(t)}>
              <Avatar thread={t} size="sm" />
              <span>{t.name}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function Conversation({
  thread,
  photos,
  onBack,
  send,
  toast,
}: {
  thread: Thread;
  photos: Photo[];
  onBack: () => void;
  send: SendMessage;
  toast: Props["toast"];
}) {
  const [viewing, setViewing] = useState<Photo | null>(null);
  const lastMine = [...thread.messages].reverse().find((m) => m.fromMe)?.id;

  return (
    <div className="app im" data-nora-screen={`Messages – conversation with ${thread.name}`}>
      <header className="im-chat-header">
        <button className="im-back" data-nora="back-button" aria-label="Back to all conversations" onClick={onBack}>
          <span aria-hidden>‹</span>
        </button>
        <div className="im-chat-who">
          <Avatar thread={thread} size="sm" />
          <span>
            {thread.name} <span aria-hidden>›</span>
          </span>
        </div>
        <button className="im-icon-btn" data-nora="video-call-button" aria-label="Video call (camera)" onClick={() => toast("Video calls aren't part of this practice phone.")}>
          <VideoIcon />
        </button>
      </header>

      <ChatMessages thread={thread} photos={photos} lastMine={lastMine} onOpenPhoto={setViewing} />

      <Composer
        key={thread.id}
        placeholder={thread.id === "drpatel" ? "Text Message" : "iMessage"}
        photos={photos}
        onSend={(m) => send(thread.id, m)}
        toast={toast}
      />

      {viewing && <PhotoViewer photo={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function ChatMessages({ thread, photos, lastMine, onOpenPhoto }: { thread: Thread; photos: Photo[]; lastMine?: string; onOpenPhoto: (p: Photo) => void }) {
  const photoById = (id: string) => photos.find((p) => p.id === id);
  const items: ReactNode[] = [];
  thread.messages.forEach((m) => {
    if (m.stamp) {
      items.push(
        <p key={`${m.id}-stamp`} className="im-stamp">
          {m.stamp}
        </p>,
      );
    }
    const label = `${m.fromMe ? "You sent" : `${thread.name} sent`}: ${m.photoIds ? `${m.photoIds.length === 1 ? "a photo" : `${m.photoIds.length} photos`} (${m.photoIds.map((id) => photoById(id)?.title ?? "photo").join(", ")}) ` : ""}${m.text ? `"${m.text}"` : ""}`;
    items.push(
      <div key={m.id} className={`im-msg ${m.fromMe ? "me" : "them"}`} data-nora={`message-${m.id}`} data-nora-type="message" data-nora-label={label}>
        {m.photoIds && (
          <div className="im-msg-photos">
            {m.photoIds.map((id) => {
              const p = photoById(id);
              return (
                p && (
                  <button key={id} className="im-msg-photo" aria-label={`Open photo: ${p.title}`} data-nora={`open-photo-${m.id}-${id}`} onClick={() => onOpenPhoto(p)}>
                    <PhotoTile photo={p} size="lg" />
                  </button>
                )
              );
            })}
          </div>
        )}
        {m.text && <span className="im-bubble">{m.text}</span>}
      </div>,
    );
    if (m.id === lastMine) {
      items.push(
        <p key={`${m.id}-delivered`} className="im-delivered" data-nora="delivered-note" data-nora-type="text">
          Delivered
        </p>,
      );
    }
  });
  if (thread.typing) {
    items.push(
      <div key="typing" className="im-msg them" data-nora="typing-indicator" data-nora-type="text" data-nora-label={`${thread.name} is typing a reply`}>
        <span className="im-bubble im-typing" aria-hidden>
          <i />
          <i />
          <i />
        </span>
      </div>,
    );
  }
  return (
    <div
      className="app-body im-chat"
      ref={(el) => {
        // Like a real chat, open scrolled to the newest message.
        if (el) el.scrollTop = el.scrollHeight;
      }}
    >
      {items}
    </div>
  );
}

function VideoIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2.5" y="6" width="13" height="12" rx="2.5" />
      <path d="M15.5 10.5 21 7v10l-5.5-3.5" />
    </svg>
  );
}

/** Message box with the + menu, photo picker and attached photos. */
function Composer({
  placeholder,
  photos,
  onSend,
  toast,
  initialPhotos = [],
  disabled,
}: {
  placeholder: string;
  photos: Photo[];
  onSend: (m: Pick<ChatMessage, "text" | "photoIds">) => void;
  toast: Props["toast"];
  initialPhotos?: string[];
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [attached, setAttached] = useState<string[]>(initialPhotos);
  const [panel, setPanel] = useState<"menu" | "photos" | null>(null);
  const canSend = !disabled && (text.trim().length > 0 || attached.length > 0);
  const photoById = (id: string) => photos.find((p) => p.id === id);
  const toggle = (id: string) => setAttached((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const doSend = () => {
    if (!canSend) return;
    onSend({ text: text.trim() || undefined, photoIds: attached.length ? attached : undefined });
    setText("");
    setAttached([]);
    setPanel(null);
  };

  return (
    <>
      <div className="im-composer">
        <button
          className={`im-plus${panel ? " open" : ""}`}
          data-nora="plus-button"
          aria-label="Plus button: add photos and more"
          onClick={() => setPanel((p) => (p ? null : "menu"))}
        >
          +
        </button>
        <div className="im-field">
          {attached.length > 0 && (
            <div className="im-attached" data-nora="attached-photos" data-nora-type="attachments" data-nora-label={`Ready to send: ${attached.map((id) => photoById(id)?.title ?? "photo").join(", ")}`}>
              {attached.map((id) => {
                const p = photoById(id);
                return (
                  p && (
                    <span key={id} className="im-attached-item">
                      <PhotoTile photo={p} size="sm" />
                      <button className="im-remove" data-nora={`remove-photo-${id}`} aria-label={`Remove ${p.title}`} onClick={() => toggle(id)}>
                        ×
                      </button>
                    </span>
                  )
                );
              })}
            </div>
          )}
          <div className="im-field-row">
            <input
              data-nora="message-box"
              aria-label="Message box"
              placeholder={attached.length ? "Add comment or Send" : placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setPanel(null)}
              onKeyDown={(e) => e.key === "Enter" && doSend()}
              autoComplete="off"
            />
            {canSend ? (
              <button className="im-send" data-nora="send-button" aria-label="Send (blue arrow)" onClick={doSend}>
                ↑
              </button>
            ) : (
              <button className="im-mic" data-nora="voice-button" aria-label="Record a voice message (microphone)" onClick={() => toast("Voice messages aren't part of this practice phone.")}>
                <MicIcon />
              </button>
            )}
          </div>
        </div>
      </div>

      {panel === "menu" && (
        <div className="im-menu-backdrop" onClick={() => setPanel(null)}>
          <div className="im-menu" role="dialog" aria-label="Add to message" onClick={(e) => e.stopPropagation()}>
            {[
              { id: "camera", icon: "📷", label: "Camera" },
              { id: "photos", icon: "🖼️", label: "Photos" },
              { id: "stickers", icon: "😀", label: "Stickers" },
              { id: "audio", icon: "🎙️", label: "Audio" },
              { id: "location", icon: "📍", label: "Location" },
            ].map((item) => (
              <button
                key={item.id}
                className="im-menu-item"
                data-nora={`menu-${item.id}`}
                onClick={() => (item.id === "photos" ? setPanel("photos") : toast(`${item.label} isn't part of this practice phone.`))}
              >
                <span className="im-menu-icon" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {panel === "photos" && (
        <div className="im-picker" role="dialog" aria-label="Choose photos to send">
          <header className="im-picker-header">
            <button className="im-picker-close" data-nora="close-photos" aria-label="Close photos" onClick={() => setPanel(null)}>
              ✕
            </button>
            <h2>Photos</h2>
            <span className="im-picker-count" data-nora="photos-selected-count" data-nora-type="text">
              {attached.length ? `${attached.length} selected` : ""}
            </span>
          </header>
          <p className="im-picker-hint">Recents</p>
          <div className="im-picker-grid">
            {photos.map((p) => {
              const on = attached.includes(p.id);
              return (
                <button
                  key={p.id}
                  className={`im-picker-cell${on ? " on" : ""}`}
                  data-nora={`pick-photo-${p.id}`}
                  data-nora-label={`Photo: ${p.title}, ${p.taken}${on ? " (selected)" : ""}`}
                  onClick={() => toggle(p.id)}
                >
                  <PhotoTile photo={p} />
                  <span className={`im-check${on ? " on" : ""}`} aria-hidden>
                    {on ? "✓" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

function MicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </svg>
  );
}

function PhotoViewer({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  return (
    <div className="im-viewer" role="dialog" aria-label={`Photo: ${photo.title}`}>
      <header className="im-viewer-header">
        <button className="im-link" data-nora="close-photo" onClick={onClose}>
          Done
        </button>
        <span>{photo.title}</span>
        <span />
      </header>
      <div className="im-viewer-photo">
        <PhotoTile photo={photo} size="lg" />
      </div>
    </div>
  );
}

/**
 * The share sheet Photos opens: suggested people, then Messages with the photo attached.
 * It sits on top of whatever app is open, like on a real phone.
 */
export function ShareSheet({
  photoIds,
  threads,
  photos,
  send,
  onClose,
  toast,
}: {
  photoIds: string[];
  threads: Thread[];
  photos: Photo[];
  send: SendMessage;
  onClose: () => void;
  toast: Props["toast"];
}) {
  const [step, setStep] = useState<"share" | "compose">("share");
  const [to, setTo] = useState<Thread | null>(null);
  const first = photos.find((p) => p.id === photoIds[0]);
  const suggested = visibleThreads(threads).filter((t) => t.id !== "drpatel").slice(0, 4);

  if (step === "compose") {
    return (
      <div className="im-share-full app im" role="dialog" aria-label="New Message" data-nora-screen="Messages – new message with a photo attached (opened from Share)">
        <NewMessageHeader onCancel={onClose} />
        <ToField threads={threads} picked={to} onPick={setTo} onClear={() => setTo(null)} />
        {to && <ChatMessages thread={to} photos={photos} onOpenPhoto={() => {}} />}
        <Composer
          placeholder="iMessage"
          photos={photos}
          initialPhotos={photoIds}
          disabled={!to}
          toast={toast}
          onSend={(m) => {
            if (!to) return;
            send(to.id, m);
            onClose();
            toast(`Sent to ${to.name}`);
          }}
        />
      </div>
    );
  }

  return (
    <div className="im-share-backdrop" onClick={onClose}>
      <div className="im-share" role="dialog" aria-label="Share" onClick={(e) => e.stopPropagation()}>
        <header className="im-share-top">
          {first && <PhotoTile photo={first} size="sm" />}
          <span>
            <strong>{photoIds.length === 1 ? "1 Photo Selected" : `${photoIds.length} Photos Selected`}</strong>
            <small>{first?.title}</small>
          </span>
          <button className="im-share-close" data-nora="close-share" aria-label="Close share sheet" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="im-share-row">
          {suggested.map((t) => (
            <button
              key={t.id}
              className="im-share-person"
              data-nora={`share-to-${t.id}`}
              data-nora-label={`Send in Messages to ${t.name}`}
              onClick={() => {
                setTo(t);
                setStep("compose");
              }}
            >
              <span className="im-share-avatar">
                <Avatar thread={t} />
                <span className="im-share-badge" aria-hidden>
                  💬
                </span>
              </span>
              <span>{t.isGroup ? t.name : t.name.split(" ")[0]}</span>
            </button>
          ))}
        </div>
        <div className="im-share-row apps">
          {[
            { id: "airdrop", icon: "📡", label: "AirDrop", bg: "#e8f1ff" },
            { id: "messages", icon: "💬", label: "Messages", bg: "#34c759" },
            { id: "mail", icon: "✉️", label: "Mail", bg: "#3478f6" },
            { id: "notes", icon: "📝", label: "Notes", bg: "#ffd60a" },
          ].map((app) => (
            <button
              key={app.id}
              className="im-share-app"
              data-nora={`share-app-${app.id}`}
              onClick={() => (app.id === "messages" ? setStep("compose") : toast(`${app.label} isn't part of this practice phone.`))}
            >
              <span className="im-share-app-icon" style={{ background: app.bg }} aria-hidden>
                {app.icon}
              </span>
              <span>{app.label}</span>
            </button>
          ))}
        </div>
        <div className="im-share-actions">
          {["Copy Photo", "Add to Album", "Save to Files", "Print"].map((a) => (
            <button key={a} className="im-share-action" data-nora={`share-action-${a.toLowerCase().replace(/\s+/g, "-")}`} onClick={() => toast(`${a} isn't part of this practice phone.`)}>
              {a}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
