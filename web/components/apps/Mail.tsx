import { useState } from "react";
import type { Email, Folder } from "@/lib/data";
import { AppHeader, ConfirmDialog } from "../ui";
import type { Route } from "../Demo";

type Props = {
  route: Route;
  go: (route: Route) => void;
  emails: Email[];
  unsubscribed: string[];
  moveEmail: (id: string, folder: Folder) => void;
  markRead: (id: string) => void;
  unsubscribe: (sender: string) => void;
  toast: (text: string) => void;
};

const FOLDER_NAMES: Record<Folder, string> = { inbox: "Inbox", spam: "Spam", trash: "Trash" };

export function MailApp({ route, go, emails, unsubscribed, moveEmail, markRead, unsubscribe, toast }: Props) {
  const [folder, setFolder] = useState<Folder>("inbox");
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState<"spam" | "delete" | "unsubscribe" | null>(null);

  const email = emails.find((e) => e.id === route.id);

  if (route.view === "email" && email) {
    const isUnsubscribed = unsubscribed.includes(email.from);
    const back = () => go({ app: "mail", view: "list" });
    return (
      <div className="app" data-nora-screen={`Mail – reading an email from ${email.from} (in ${FOLDER_NAMES[email.folder]})`}>
        <AppHeader
          title=""
          backLabel={`Back to ${FOLDER_NAMES[folder]}`}
          onBack={back}
          right={
            email.folder === "inbox" ? (
              <>
                <button className="icon-btn" data-nora="report-spam-button" aria-label="Report spam" onClick={() => setConfirm("spam")}>
                  ⚠️
                </button>
                <button className="icon-btn" data-nora="delete-button" aria-label="Delete email (trash can)" onClick={() => setConfirm("delete")}>
                  🗑️
                </button>
              </>
            ) : (
              <button
                className="icon-btn"
                data-nora="move-to-inbox-button"
                aria-label="Move back to Inbox"
                onClick={() => {
                  moveEmail(email.id, "inbox");
                  toast("Moved to Inbox");
                  back();
                }}
              >
                📥
              </button>
            )
          }
        />
        <div className="app-body">
          <h2 className="email-subject" data-nora="email-subject">
            {email.subject}
          </h2>
          <p className="email-from" data-nora="email-sender">
            <strong>{email.from}</strong> <span className="muted">&lt;{email.address}&gt;</span>
          </p>
          {isUnsubscribed && (
            <p className="info-banner" data-nora="unsubscribed-banner">
              You unsubscribed from {email.from}. You won&apos;t get new emails from them.
            </p>
          )}
          <div className="email-body" data-nora="email-body" data-nora-type="email text">
            {email.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          {email.cta && (
            <button
              className={email.kind === "spam" ? "btn btn-scam" : "btn btn-ad"}
              data-nora="email-link-button"
              onClick={() => toast("This button would open a website.")}
            >
              {email.cta}
            </button>
          )}
          {email.kind === "ad" && (
            <footer className="email-footer">
              You are receiving this email because you joined the {email.from} mailing list.{" "}
              <button className="link-btn" data-nora="unsubscribe-link" data-nora-type="link" onClick={() => setConfirm("unsubscribe")}>
                Unsubscribe
              </button>{" "}
              ·{" "}
              <button className="link-btn" data-nora="preferences-link" data-nora-type="link" onClick={() => toast("Preferences aren't part of this practice phone.")}>
                Update preferences
              </button>
            </footer>
          )}
        </div>
        {confirm === "spam" && (
          <ConfirmDialog
            title="Report spam?"
            body="This email will move to your Spam folder, and you'll get fewer emails like it."
            confirmLabel="Report spam"
            confirmId="confirm-report-spam"
            danger
            onCancel={() => setConfirm(null)}
            onConfirm={() => {
              setConfirm(null);
              moveEmail(email.id, "spam");
              toast("Reported as spam");
              back();
            }}
          />
        )}
        {confirm === "delete" && (
          <ConfirmDialog
            title="Delete this email?"
            body="It will move to your Trash folder."
            confirmLabel="Delete"
            confirmId="confirm-delete"
            danger
            onCancel={() => setConfirm(null)}
            onConfirm={() => {
              setConfirm(null);
              moveEmail(email.id, "trash");
              toast("Moved to Trash");
              back();
            }}
          />
        )}
        {confirm === "unsubscribe" && (
          <ConfirmDialog
            title={`Unsubscribe from ${email.from}?`}
            body="You'll stop getting their emails."
            confirmLabel="Unsubscribe"
            confirmId="confirm-unsubscribe"
            onCancel={() => setConfirm(null)}
            onConfirm={() => {
              setConfirm(null);
              unsubscribe(email.from);
              toast(`Unsubscribed from ${email.from}`);
            }}
          />
        )}
      </div>
    );
  }

  const shown = emails.filter((e) => e.folder === folder);
  const count = (f: Folder) => emails.filter((e) => e.folder === f).length;

  return (
    <div className="app" data-nora-screen={`Mail – ${FOLDER_NAMES[folder]} folder`}>
      <AppHeader
        title={FOLDER_NAMES[folder]}
        backLabel="Back to home screen"
        onBack={() => go({ app: "home", view: "home" })}
        right={
          <button className="icon-btn" data-nora="folders-menu-button" aria-label="Menu (three lines): switch folders" onClick={() => setMenuOpen(true)}>
            ☰
          </button>
        }
      />
      <div className="app-body flush">
        {shown.length === 0 && (
          <p className="empty" data-nora="empty-folder">
            No emails in {FOLDER_NAMES[folder]}
          </p>
        )}
        {shown.map((e) => (
          <button
            key={e.id}
            className={`email-row${e.read ? "" : " unread"}`}
            data-nora={`email-${e.id}`}
            data-nora-label={`Email from ${e.from}: "${e.subject}"${e.read ? "" : " (unread)"}${unsubscribed.includes(e.from) ? " (you unsubscribed from this sender)" : ""}`}
            onClick={() => {
              markRead(e.id);
              go({ app: "mail", view: "email", id: e.id });
            }}
          >
            <span className="avatar">{e.from[0]}</span>
            <span className="email-row-text">
              <span className="email-row-from">{e.from}</span>
              <span className="email-row-subject">{e.subject}</span>
              <span className="email-row-preview">{e.preview}</span>
            </span>
          </button>
        ))}
      </div>
      {menuOpen && (
        <div className="sheet-backdrop" onClick={() => setMenuOpen(false)}>
          <div className="drawer" role="dialog" aria-label="Folders menu" onClick={(ev) => ev.stopPropagation()}>
            <h2>Folders</h2>
            {(Object.keys(FOLDER_NAMES) as Folder[]).map((f) => (
              <button
                key={f}
                className={`drawer-item${f === folder ? " active" : ""}`}
                data-nora={`folder-${f}`}
                data-nora-label={`${FOLDER_NAMES[f]} folder (${count(f)} ${count(f) === 1 ? "email" : "emails"})`}
                onClick={() => {
                  setFolder(f);
                  setMenuOpen(false);
                }}
              >
                <span>{FOLDER_NAMES[f]}</span>
                <span className="muted">{count(f)}</span>
              </button>
            ))}
            <button className="drawer-item" data-nora="close-menu" onClick={() => setMenuOpen(false)}>
              Close menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
