import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import type { Email, Folder } from "@/lib/data";
import type { Route } from "../Demo";
import "@/app/mail.css";

// A Gmail-style mail app: the same layout and buttons as Gmail on a phone, with neutral branding.
// Practice tasks: report or delete the Prize Center spam, and unsubscribe from ShopMart Deals.

type Props = {
  route: Route;
  go: (route: Route) => void;
  emails: Email[];
  updateEmails: (fn: (emails: Email[]) => Email[]) => void;
  unsubscribed: string[];
  unsubscribe: (sender: string) => void;
  toast: (text: string) => void;
};

type Box = "inbox" | "starred" | "snoozed" | "important" | "sent" | "drafts" | "all" | "spam" | "trash";

const BOXES: { box: Box; label: string; icon: IconName }[] = [
  { box: "inbox", label: "Inbox", icon: "inbox" },
  { box: "starred", label: "Starred", icon: "star_border" },
  { box: "snoozed", label: "Snoozed", icon: "schedule" },
  { box: "important", label: "Important", icon: "label" },
  { box: "sent", label: "Sent", icon: "send" },
  { box: "drafts", label: "Drafts", icon: "draft" },
  { box: "all", label: "All mail", icon: "all_mail" },
  { box: "spam", label: "Spam", icon: "report" },
  { box: "trash", label: "Trash", icon: "delete" },
];

const BOX_LABEL = Object.fromEntries(BOXES.map((b) => [b.box, b.label])) as Record<Box, string>;
const FOLDER_LABEL: Record<Folder, string> = { inbox: "Inbox", archive: "All mail", spam: "Spam", trash: "Trash", deleted: "Deleted" };

function inBox(e: Email, box: Box): boolean {
  switch (box) {
    case "inbox":
      return e.folder === "inbox";
    case "starred":
      return e.starred && (e.folder === "inbox" || e.folder === "archive");
    case "all":
      return e.folder === "inbox" || e.folder === "archive";
    case "spam":
      return e.folder === "spam";
    case "trash":
      return e.folder === "trash";
    default:
      return false;
  }
}

const AVATAR_COLORS = ["#1a73e8", "#e8710a", "#188038", "#a142f4", "#d93025", "#12b5cb", "#e52592", "#9334e6", "#f29900", "#5f6368"];
function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

type Snack = { text: string; undo?: () => void };
type Menu = "top" | "sender" | "select" | null;
type Dialog =
  | { kind: "spam-unsub"; ids: string[]; sender: string }
  | { kind: "unsubscribe"; sender: string }
  | { kind: "block"; sender: string }
  | { kind: "move"; ids: string[] }
  | { kind: "empty"; folder: "spam" | "trash" }
  | null;
type Draft = { to: string; subject: string };

export function MailApp({ route, go, emails, updateEmails, unsubscribed, unsubscribe, toast }: Props) {
  const [box, setBox] = useState<Box>("inbox");
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [menu, setMenu] = useState<Menu>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [snack, setSnack] = useState<Snack | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const snackTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(snackTimer.current), []);

  const showSnack = (text: string, undo?: () => void) => {
    clearTimeout(snackTimer.current);
    setSnack({ text, undo });
    snackTimer.current = setTimeout(() => setSnack(null), 6000);
  };

  const email = emails.find((e) => e.id === route.id);
  const list = () => go({ app: "mail", view: "list" });
  const open = (e: Email) => {
    updateEmails((es) => es.map((x) => (x.id === e.id ? { ...x, read: true } : x)));
    setMenu(null);
    go({ app: "mail", view: "email", id: e.id });
  };

  const setFields = (ids: string[], fields: Partial<Email>) =>
    updateEmails((es) => es.map((e) => (ids.includes(e.id) ? { ...e, ...fields } : e)));

  // Moves emails to a folder, with an Undo button on the message at the bottom, like Gmail.
  const move = (ids: string[], folder: Folder, text: string) => {
    const before = new Map(emails.filter((e) => ids.includes(e.id)).map((e) => [e.id, e.folder]));
    setFields(ids, { folder });
    setSelected([]);
    setMenu(null);
    showSnack(text, () => updateEmails((es) => es.map((e) => (before.has(e.id) ? { ...e, folder: before.get(e.id)! } : e))));
  };

  const count = (ids: string[], one: string, many: string) => (ids.length === 1 ? one : `${ids.length} ${many}`);

  const archive = (ids: string[]) => move(ids, "archive", count(ids, "Archived", "archived"));

  const remove = (ids: string[]) => {
    const inTrash = emails.filter((e) => ids.includes(e.id)).every((e) => e.folder === "trash");
    if (inTrash) move(ids, "deleted", count(ids, "Deleted forever", "deleted forever"));
    else move(ids, "trash", count(ids, "Moved to Trash", "moved to Trash"));
  };

  const reportSpam = (ids: string[]) => {
    setMenu(null);
    const mailingList = emails.find((e) => ids.includes(e.id) && e.kind === "ad" && !unsubscribed.includes(e.from));
    if (mailingList) return setDialog({ kind: "spam-unsub", ids, sender: mailingList.from });
    move(ids, "spam", count(ids, "Reported as spam", "reported as spam"));
    if (route.view === "email") list();
  };

  const comingSoon = (what: string) => {
    setMenu(null);
    toast(`${what} isn't part of this practice phone.`);
  };

  const compose = (d: Draft) => {
    setMenu(null);
    setDraft(d);
  };

  // ---------- Screens ----------

  let screen: ReactNode;

  if (draft) {
    screen = (
      <ComposeScreen
        draft={draft}
        onClose={() => setDraft(null)}
        onSend={() => {
          setDraft(null);
          showSnack("Sent");
        }}
        toast={toast}
      />
    );
  } else if (route.view === "unsubscribe-page" && email) {
    screen = (
      <UnsubscribePage
        email={email}
        done={unsubscribed.includes(email.from)}
        unsubscribe={() => unsubscribe(email.from)}
        close={() => go({ app: "mail", view: "email", id: email.id })}
        toast={toast}
      />
    );
  } else if (route.view === "email" && email && email.folder !== "deleted") {
    const isUnsub = unsubscribed.includes(email.from);
    const inSpamOrTrash = email.folder === "spam" || email.folder === "trash";
    screen = (
      <div className="app gm" data-nora-screen={`Mail – reading an email from ${email.from}`}>
        <div className="gm-topbar">
          <IconButton icon="arrow_back" label="Back" onClick={list} />
          <span className="gm-spacer" />
          {!inSpamOrTrash && <IconButton icon="archive" label="Archive" onClick={() => (archive([email.id]), list())} />}
          <IconButton icon="delete" label={email.folder === "trash" ? "Delete forever" : "Delete"} onClick={() => (remove([email.id]), list())} />
          <IconButton
            icon="mail"
            label="Mark as unread"
            onClick={() => {
              setFields([email.id], { read: false });
              list();
              showSnack("Marked as unread");
            }}
          />
          <IconButton icon="more_vert" label="More options" onClick={() => setMenu("top")} />
        </div>

        <div className="app-body gm-body">
          <div className="gm-subject-row">
            <h1 className="gm-subject">
              {email.subject} <span className="gm-chip">{FOLDER_LABEL[email.folder]}</span>
            </h1>
            <StarButton starred={email.starred} onClick={() => setFields([email.id], { starred: !email.starred })} />
          </div>

          {email.folder === "spam" && (
            <div className="gm-banner">
              <strong>Why is this message in spam?</strong>
              <span>It&apos;s similar to messages that were reported as spam.</span>
              <button className="gm-text-btn" onClick={() => (move([email.id], "inbox", "Reported not spam"), list())}>
                Report not spam
              </button>
            </div>
          )}
          {email.folder === "trash" && (
            <div className="gm-banner">
              <span>This message is in Trash.</span>
              <button className="gm-text-btn" onClick={() => (move([email.id], "inbox", "Moved to Inbox"), list())}>
                Move to Inbox
              </button>
            </div>
          )}

          <div className="gm-sender-row">
            <Avatar name={email.from} />
            <div className="gm-sender-text">
              <div>
                <strong>{email.from}</strong> <span className="gm-muted">{email.time}</span>
              </div>
              <button className="gm-to-me" onClick={() => toast(`From: ${email.address}`)}>
                to me <Icon name="arrow_drop_down" size={18} />
              </button>
            </div>
            <IconButton icon="reply" label="Reply" onClick={() => compose({ to: email.address, subject: `Re: ${email.subject}` })} />
            <IconButton icon="more_vert" label="More options for this message" onClick={() => setMenu("sender")} />
          </div>

          {email.kind === "ad" &&
            (isUnsub ? (
              <p className="gm-banner gm-banner-ok">You unsubscribed from {email.from}. You won&apos;t get new emails from them.</p>
            ) : (
              <button className="gm-unsub-chip" onClick={() => setDialog({ kind: "unsubscribe", sender: email.from })}>
                Unsubscribe
              </button>
            ))}

          <div className="gm-message">
            {email.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
            {email.cta && (
              <button className={`gm-cta${email.kind === "spam" ? " scam" : ""}`} onClick={() => toast("This button would open a website.")}>
                {email.cta}
              </button>
            )}
            {email.kind === "ad" && (
              <footer className="gm-mail-footer">
                You are receiving this email because you signed up for {email.from} emails at {email.address}.
                <br />
                <button className="gm-footer-link" onClick={() => go({ app: "mail", view: "unsubscribe-page", id: email.id })}>
                  Unsubscribe
                </button>{" "}
                ·{" "}
                <button className="gm-footer-link" onClick={() => toast("This link would open a website.")}>
                  Manage preferences
                </button>
                <br />© 2026 {email.from}, 400 Market Street
              </footer>
            )}
          </div>

          <div className="gm-reply-row">
            <button className="gm-reply-btn" onClick={() => compose({ to: email.address, subject: `Re: ${email.subject}` })}>
              <Icon name="reply" size={20} /> Reply
            </button>
            <button className="gm-reply-btn" onClick={() => compose({ to: email.address, subject: `Re: ${email.subject}` })}>
              <Icon name="reply_all" size={20} /> Reply all
            </button>
            <button className="gm-reply-btn" onClick={() => compose({ to: "", subject: `Fwd: ${email.subject}` })}>
              <Icon name="forward" size={20} /> Forward
            </button>
          </div>
        </div>

        {menu === "top" && (
          <PopupMenu onClose={() => setMenu(null)} top>
            <MenuItem onClick={() => (setMenu(null), setDialog({ kind: "move", ids: [email.id] }))}>Move to</MenuItem>
            {!inSpamOrTrash && <MenuItem onClick={() => comingSoon("Snooze")}>Snooze</MenuItem>}
            <MenuItem onClick={() => comingSoon("Labels")}>Change labels</MenuItem>
            {!inSpamOrTrash && <MenuItem onClick={() => (setMenu(null), showSnack("Marked as important"))}>Mark as important</MenuItem>}
            {!inSpamOrTrash && <MenuItem onClick={() => (move([email.id], "archive", "Muted"), list())}>Mute</MenuItem>}
            <MenuItem onClick={() => comingSoon("Printing")}>Print</MenuItem>
            {email.folder === "spam" ? (
              <MenuItem onClick={() => (move([email.id], "inbox", "Reported not spam"), list())}>Report not spam</MenuItem>
            ) : (
              <MenuItem onClick={() => reportSpam([email.id])}>Report spam</MenuItem>
            )}
            {!inSpamOrTrash && <MenuItem onClick={() => comingSoon("Tasks")}>Add to Tasks</MenuItem>}
            <MenuItem onClick={() => comingSoon("Help")}>Help &amp; feedback</MenuItem>
          </PopupMenu>
        )}
        {menu === "sender" && (
          <PopupMenu onClose={() => setMenu(null)} anchor={150}>
            <MenuItem onClick={() => compose({ to: email.address, subject: `Re: ${email.subject}` })}>Reply</MenuItem>
            <MenuItem onClick={() => compose({ to: email.address, subject: `Re: ${email.subject}` })}>Reply all</MenuItem>
            <MenuItem onClick={() => compose({ to: "", subject: `Fwd: ${email.subject}` })}>Forward</MenuItem>
            <MenuItem onClick={() => (setFields([email.id], { starred: !email.starred }), setMenu(null))}>{email.starred ? "Remove star" : "Add star"}</MenuItem>
            <MenuItem onClick={() => comingSoon("Printing")}>Print</MenuItem>
            <MenuItem onClick={() => (setFields([email.id], { read: false }), list(), showSnack("Marked as unread"))}>Mark unread from here</MenuItem>
            <MenuItem onClick={() => (setMenu(null), setDialog({ kind: "block", sender: email.from }))}>Block &quot;{email.from}&quot;</MenuItem>
            {email.folder !== "spam" && <MenuItem onClick={() => reportSpam([email.id])}>Report spam</MenuItem>}
            {email.folder !== "spam" && <MenuItem onClick={() => (move([email.id], "spam", "Reported as phishing"), list())}>Report phishing</MenuItem>}
            <MenuItem onClick={() => comingSoon("Show original")}>Show original</MenuItem>
          </PopupMenu>
        )}
      </div>
    );
  } else {
    // ---------- Email list ----------
    const searching = search !== null;
    const query = (search ?? "").trim().toLowerCase();
    const shown = searching
      ? query
        ? emails.filter(
            (e) =>
              (e.folder === "inbox" || e.folder === "archive") &&
              [e.from, e.address, e.subject, e.preview].some((t) => t.toLowerCase().includes(query)),
          )
        : []
      : emails.filter((e) => inBox(e, box));
    const selecting = selected.length > 0;
    const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    const anyUnread = emails.some((e) => selected.includes(e.id) && !e.read);
    const inboxUnread = emails.filter((e) => e.folder === "inbox" && !e.read).length;

    screen = (
      <div className="app gm" data-nora-screen={`Mail – ${searching ? "search" : BOX_LABEL[box]}`}>
        {selecting ? (
          <div className="gm-topbar gm-selectbar">
            <IconButton icon="close" label="Cancel selection" onClick={() => setSelected([])} />
            <span className="gm-select-count">{selected.length}</span>
            <span className="gm-spacer" />
            {box !== "spam" && box !== "trash" && <IconButton icon="archive" label="Archive" onClick={() => archive(selected)} />}
            <IconButton icon="delete" label="Delete" onClick={() => remove(selected)} />
            <IconButton
              icon={anyUnread ? "drafts_open" : "mail"}
              label={anyUnread ? "Mark as read" : "Mark as unread"}
              onClick={() => {
                setFields(selected, { read: anyUnread });
                setSelected([]);
              }}
            />
            <IconButton icon="more_vert" label="More options" onClick={() => setMenu("select")} />
          </div>
        ) : searching ? (
          <div className="gm-topbar gm-searchbar">
            <IconButton icon="arrow_back" label="Close search" onClick={() => setSearch(null)} />
            <input
              className="gm-search-input"
              autoFocus
              placeholder="Search in mail"
              aria-label="Search in mail"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && <IconButton icon="close" label="Clear search" onClick={() => setSearch("")} />}
          </div>
        ) : (
          <div className="gm-header">
            <div className="gm-search-pill">
              <IconButton icon="menu" label="Open menu (three lines)" onClick={() => setDrawer(true)} />
              <button className="gm-search-text" onClick={() => setSearch("")}>
                Search in mail
              </button>
              <button className="gm-account" aria-label="Account" onClick={() => toast("Account settings aren't part of this practice phone.")}>
                M
              </button>
            </div>
          </div>
        )}

        <div className="app-body gm-list">
          {!searching && <p className="gm-box-label">{BOX_LABEL[box]}</p>}
          {!searching && (box === "spam" || box === "trash") && shown.length > 0 && (
            <div className="gm-banner gm-folder-banner">
              <span>
                {box === "spam"
                  ? "Messages that have been in Spam more than 30 days will be deleted automatically."
                  : "Messages that have been in Trash more than 30 days will be deleted automatically."}
              </span>
              <button className="gm-text-btn" onClick={() => setDialog({ kind: "empty", folder: box })}>
                Empty {box === "spam" ? "Spam" : "Trash"} now
              </button>
            </div>
          )}
          {searching && !query && <p className="gm-empty">Type a name or word to search your email.</p>}
          {(query || !searching) && shown.length === 0 && (
            <p className="gm-empty">{searching ? "No results" : `Nothing in ${BOX_LABEL[box]}`}</p>
          )}
          {shown.map((e) => (
            <EmailRow
              key={e.id}
              email={e}
              selected={selected.includes(e.id)}
              selecting={selecting}
              onOpen={() => (selecting ? toggle(e.id) : open(e))}
              onSelect={() => toggle(e.id)}
              onStar={() => setFields([e.id], { starred: !e.starred })}
            />
          ))}
        </div>

        {!selecting && !searching && (
          <button className="gm-compose" onClick={() => compose({ to: "", subject: "" })}>
            <Icon name="edit" /> Compose
          </button>
        )}

        {drawer && (
          <div className="gm-drawer-backdrop" onClick={() => setDrawer(false)}>
            <nav className="gm-drawer" aria-label="Mail menu" onClick={(ev) => ev.stopPropagation()}>
              <p className="gm-drawer-title">Mail</p>
              {BOXES.map((b) => (
                <button
                  key={b.box}
                  className={`gm-drawer-item${b.box === box ? " active" : ""}`}
                  onClick={() => {
                    setBox(b.box);
                    setSelected([]);
                    setDrawer(false);
                  }}
                >
                  <Icon name={b.icon} />
                  <span>{b.label}</span>
                  {b.box === "inbox" && inboxUnread > 0 && <span className="gm-drawer-count">{inboxUnread}</span>}
                </button>
              ))}
              <hr />
              <button className="gm-drawer-item" onClick={() => (setDrawer(false), comingSoon("Settings"))}>
                <Icon name="settings" />
                <span>Settings</span>
              </button>
              <button className="gm-drawer-item" onClick={() => (setDrawer(false), comingSoon("Help"))}>
                <Icon name="help" />
                <span>Help &amp; feedback</span>
              </button>
            </nav>
          </div>
        )}

        {menu === "select" && (
          <PopupMenu onClose={() => setMenu(null)} top>
            <MenuItem onClick={() => (setMenu(null), setDialog({ kind: "move", ids: selected }))}>Move to</MenuItem>
            <MenuItem onClick={() => comingSoon("Snooze")}>Snooze</MenuItem>
            <MenuItem onClick={() => comingSoon("Labels")}>Change labels</MenuItem>
            <MenuItem onClick={() => (setSelected([]), setMenu(null), showSnack("Marked as important"))}>Mark as important</MenuItem>
            <MenuItem onClick={() => move(selected, "archive", "Muted")}>Mute</MenuItem>
            {box !== "spam" && <MenuItem onClick={() => reportSpam(selected)}>Report spam</MenuItem>}
            <MenuItem onClick={() => (setFields(selected, { starred: true }), setSelected([]), setMenu(null))}>Add star</MenuItem>
            <MenuItem onClick={() => (setSelected(shown.map((e) => e.id)), setMenu(null))}>Select all</MenuItem>
          </PopupMenu>
        )}
      </div>
    );
  }

  return (
    <>
      {screen}
      {dialog?.kind === "spam-unsub" && (
        <MailDialog title="Report spam and unsubscribe?" onCancel={() => setDialog(null)}>
          <p>You can also unsubscribe from {dialog.sender} so you stop getting their emails.</p>
          <div className="gm-dialog-actions stacked">
            <button
              className="gm-text-btn"
              onClick={() => {
                unsubscribe(dialog.sender);
                move(dialog.ids, "spam", `Reported as spam and unsubscribed from ${dialog.sender}`);
                setDialog(null);
                if (route.view === "email") list();
              }}
            >
              Report spam and unsubscribe
            </button>
            <button
              className="gm-text-btn"
              onClick={() => {
                move(dialog.ids, "spam", count(dialog.ids, "Reported as spam", "reported as spam"));
                setDialog(null);
                if (route.view === "email") list();
              }}
            >
              Report spam
            </button>
            <button className="gm-text-btn" onClick={() => setDialog(null)}>
              Cancel
            </button>
          </div>
        </MailDialog>
      )}
      {dialog?.kind === "unsubscribe" && (
        <MailDialog title={`Unsubscribe from ${dialog.sender}?`} onCancel={() => setDialog(null)}>
          <p>You&apos;ll stop getting emails from this mailing list. It may take a few days to take effect.</p>
          <div className="gm-dialog-actions">
            <button className="gm-text-btn" onClick={() => setDialog(null)}>
              Cancel
            </button>
            <button
              className="gm-text-btn"
              onClick={() => {
                unsubscribe(dialog.sender);
                showSnack(`Unsubscribed from ${dialog.sender}`);
                setDialog(null);
              }}
            >
              Unsubscribe
            </button>
          </div>
        </MailDialog>
      )}
      {dialog?.kind === "block" && (
        <MailDialog title={`Block ${dialog.sender}?`} onCancel={() => setDialog(null)}>
          <p>Emails from this sender will go to Spam.</p>
          <div className="gm-dialog-actions">
            <button className="gm-text-btn" onClick={() => setDialog(null)}>
              Cancel
            </button>
            <button
              className="gm-text-btn"
              onClick={() => {
                const ids = emails.filter((e) => e.from === dialog.sender && e.folder !== "trash" && e.folder !== "deleted").map((e) => e.id);
                move(ids, "spam", `Blocked ${dialog.sender}`);
                setDialog(null);
                if (route.view === "email") list();
              }}
            >
              Block
            </button>
          </div>
        </MailDialog>
      )}
      {dialog?.kind === "move" && (
        <MailDialog title="Move to" onCancel={() => setDialog(null)}>
          <div className="gm-move-list">
            {(["inbox", "spam", "trash"] as const).map((f) => (
              <button
                key={f}
                className="gm-move-item"
                onClick={() => {
                  move(dialog.ids, f, `Moved to ${FOLDER_LABEL[f]}`);
                  setDialog(null);
                  if (route.view === "email") list();
                }}
              >
                <Icon name={f === "inbox" ? "inbox" : f === "spam" ? "report" : "delete"} /> {FOLDER_LABEL[f]}
              </button>
            ))}
          </div>
          <div className="gm-dialog-actions">
            <button className="gm-text-btn" onClick={() => setDialog(null)}>
              Cancel
            </button>
          </div>
        </MailDialog>
      )}
      {dialog?.kind === "empty" && (
        <MailDialog title={`Delete all messages in ${FOLDER_LABEL[dialog.folder]}?`} onCancel={() => setDialog(null)}>
          <p>This can&apos;t be undone.</p>
          <div className="gm-dialog-actions">
            <button className="gm-text-btn" onClick={() => setDialog(null)}>
              Cancel
            </button>
            <button
              className="gm-text-btn"
              onClick={() => {
                const folder = dialog.folder;
                updateEmails((es) => es.map((e) => (e.folder === folder ? { ...e, folder: "deleted" } : e)));
                setDialog(null);
                showSnack(`${FOLDER_LABEL[folder]} emptied`);
              }}
            >
              Delete
            </button>
          </div>
        </MailDialog>
      )}
      {snack && (
        <div className="gm-snackbar" role="status">
          <span>{snack.text}</span>
          {snack.undo && (
            <button
              className="gm-snack-undo"
              onClick={() => {
                snack.undo?.();
                setSnack(null);
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
    </>
  );
}

// ---------- Pieces ----------

function EmailRow({
  email: e,
  selected,
  selecting,
  onOpen,
  onSelect,
  onStar,
}: {
  email: Email;
  selected: boolean;
  selecting: boolean;
  onOpen: () => void;
  onSelect: () => void;
  onStar: () => void;
}) {
  // Holding a finger on an email selects it, like Gmail.
  const pressTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const longPressed = useRef(false);

  return (
    <div
      className={`gm-row${e.read ? "" : " unread"}${selected ? " selected" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={`Email from ${e.from}: ${e.subject}${e.read ? "" : " (unread)"}`}
      onPointerDown={() => {
        longPressed.current = false;
        pressTimer.current = setTimeout(() => {
          longPressed.current = true;
          onSelect();
        }, 550);
      }}
      onPointerUp={() => clearTimeout(pressTimer.current)}
      onPointerLeave={() => clearTimeout(pressTimer.current)}
      onPointerCancel={() => clearTimeout(pressTimer.current)}
      onContextMenu={(ev) => ev.preventDefault()}
      onClick={() => {
        if (longPressed.current) return;
        onOpen();
      }}
    >
      <button
        className="gm-row-avatar"
        aria-label={selected ? `Unselect email from ${e.from}` : `Select email from ${e.from}`}
        onClick={(ev) => {
          ev.stopPropagation();
          onSelect();
        }}
      >
        {selected ? (
          <span className="gm-avatar gm-avatar-check">
            <Icon name="check" />
          </span>
        ) : (
          <Avatar name={e.from} />
        )}
      </button>
      <div className="gm-row-text">
        <div className="gm-row-top">
          <span className="gm-row-from">{e.from}</span>
          <span className="gm-row-time">{e.time}</span>
        </div>
        <div className="gm-row-subject">{e.subject}</div>
        <div className="gm-row-bottom">
          <span className="gm-row-preview">{e.preview}</span>
          {!selecting && (
            <StarButton
              starred={e.starred}
              small
              onClick={(ev) => {
                ev.stopPropagation();
                onStar();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ComposeScreen({ draft, onClose, onSend, toast }: { draft: Draft; onClose: () => void; onSend: () => void; toast: (t: string) => void }) {
  const [to, setTo] = useState(draft.to);
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState("");
  return (
    <div className="app gm" data-nora-screen="Mail – writing an email">
      <div className="gm-topbar">
        <IconButton icon="arrow_back" label="Close (saves nothing)" onClick={onClose} />
        <span className="gm-compose-title">Compose</span>
        <span className="gm-spacer" />
        <IconButton icon="attach" label="Attach file" onClick={() => toast("Attachments aren't part of this practice phone.")} />
        <IconButton
          icon="send"
          label="Send"
          onClick={() => {
            if (!to.trim()) return toast("Add at least one recipient.");
            onSend();
          }}
        />
        <IconButton icon="more_vert" label="More options" onClick={() => toast("More options aren't part of this practice phone.")} />
      </div>
      <div className="app-body gm-compose-body">
        <label className="gm-compose-field">
          <span>From</span>
          <input value="me@mailbox.example" readOnly />
        </label>
        <label className="gm-compose-field">
          <span>To</span>
          <input value={to} onChange={(e) => setTo(e.target.value)} autoComplete="off" autoCapitalize="none" inputMode="email" />
        </label>
        <label className="gm-compose-field">
          <input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} autoComplete="off" />
        </label>
        <textarea className="gm-compose-text" placeholder="Compose email" value={body} onChange={(e) => setBody(e.target.value)} />
        <p className="gm-muted gm-practice">Practice phone: emails aren&apos;t really sent.</p>
      </div>
    </div>
  );
}

// The page a mailing list's own "unsubscribe" link opens, shown in Gmail's in-app browser.
function UnsubscribePage({ email, done, unsubscribe, close, toast }: { email: Email; done: boolean; unsubscribe: () => void; close: () => void; toast: (t: string) => void }) {
  const domain = email.address.split("@")[1];
  return (
    <div className="app gm" data-nora-screen={`Web page from ${email.from} about unsubscribing`}>
      <div className="gm-topbar gm-webbar">
        <IconButton icon="close" label="Close web page" onClick={close} />
        <div className="gm-webbar-text">
          <strong>{email.from}</strong>
          <span>🔒 {domain}</span>
        </div>
        <IconButton icon="more_vert" label="More options" onClick={() => toast("More options aren't part of this practice phone.")} />
      </div>
      <div className="app-body gm-unsub-page">
        <div className="gm-unsub-brand" style={{ background: avatarColor(email.from) }}>
          {email.from}
        </div>
        {done ? (
          <>
            <h1>You&apos;ve been unsubscribed</h1>
            <p>
              <strong>{email.address.replace(/^[^@]+/, "you")}</strong> will no longer get emails from {email.from}. It can take up to 10 days.
            </p>
            <button className="gm-unsub-primary" onClick={close}>
              Back to email
            </button>
          </>
        ) : (
          <>
            <h1>Email preferences</h1>
            <p>We&apos;re sorry to see you go! Do you want to stop getting all emails from {email.from}?</p>
            <button className="gm-unsub-primary" onClick={unsubscribe}>
              Unsubscribe from all emails
            </button>
            <button className="gm-unsub-secondary" onClick={close}>
              Keep me subscribed
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function MailDialog({ title, children, onCancel }: { title: string; children: ReactNode; onCancel: () => void }) {
  return (
    <div className="gm-dialog-backdrop" onClick={onCancel}>
      <div className="gm-dialog" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function PopupMenu({ children, onClose, top, anchor }: { children: ReactNode; onClose: () => void; top?: boolean; anchor?: number }) {
  return (
    <div className="gm-menu-backdrop" onClick={onClose}>
      <div className="gm-menu" role="menu" style={top ? { top: 8 } : { top: anchor }} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function MenuItem({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="gm-menu-item" role="menuitem" onClick={onClick}>
      {children}
    </button>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="gm-avatar" style={{ background: avatarColor(name) }} aria-hidden>
      {name[0]}
    </span>
  );
}

function StarButton({ starred, onClick, small }: { starred: boolean; onClick: (ev: MouseEvent) => void; small?: boolean }) {
  return (
    <button className={`gm-star${starred ? " on" : ""}${small ? " small" : ""}`} aria-label={starred ? "Starred" : "Not starred"} onClick={onClick}>
      <Icon name={starred ? "star" : "star_border"} size={small ? 22 : 26} />
    </button>
  );
}

function IconButton({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button className="gm-icon-btn" aria-label={label} title={label} onClick={onClick}>
      <Icon name={icon} />
    </button>
  );
}

// Material Design icons (Apache 2.0).
const ICONS = {
  menu: "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
  arrow_back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
  arrow_drop_down: "M7 10l5 5 5-5z",
  archive:
    "M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z",
  delete: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
  mail: "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",
  drafts_open:
    "M21.99 8c0-.72-.37-1.35-.94-1.7L12 1 2.95 6.3C2.38 6.65 2 7.28 2 8v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2l-.01-10zM12 13L3.74 7.84 12 3l8.26 4.84L12 13z",
  more_vert: "M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
  star: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  star_border:
    "M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z",
  reply: "M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z",
  reply_all: "M7 8V5l-7 7 7 7v-3l-4-4 4-4zm6 1V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z",
  forward: "M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z",
  edit: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 000-1.41l-2.34-2.34a.996.996 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  inbox: "M19 3H4.99c-1.11 0-1.98.89-1.98 2L3 19c0 1.1.88 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.11-.9-2-2-2zm0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H4.99V5H19v10z",
  report:
    "M15.73 3H8.27L3 8.27v7.46L8.27 21h7.46L21 15.73V8.27L15.73 3zM12 17.3c-.72 0-1.3-.58-1.3-1.3 0-.72.58-1.3 1.3-1.3.72 0 1.3.58 1.3 1.3 0 .72-.58 1.3-1.3 1.3zm1-4.3h-2V7h2v6z",
  send: "M2.01 21L23 12 2.01 3 2 10l15 2-15 2z",
  schedule:
    "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z",
  label: "M3.5 18.99l11 .01c.67 0 1.27-.33 1.63-.84L20.5 12l-4.37-6.16c-.36-.51-.96-.84-1.63-.84l-11 .01L8.34 12 3.5 18.99z",
  draft: "M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z",
  all_mail: "M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z",
  settings:
    "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
  help: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z",
  attach:
    "M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 015 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 005 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z",
};

type IconName = keyof typeof ICONS;

function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  );
}
