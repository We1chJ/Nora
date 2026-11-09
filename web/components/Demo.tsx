"use client";

import { useCallback, useRef, useState } from "react";
import { INITIAL_EMAILS, INITIAL_PHOTOS, INITIAL_THREADS, type Account, type ChatMessage, type Registration } from "@/lib/data";
import { Home } from "./apps/Home";
import { EventsSite } from "./apps/Events";
import { MailApp } from "./apps/Mail";
import { PhotosApp } from "./apps/Photos";
import { MessagesApp } from "./apps/Messages";
import { Nora } from "./Nora";

export type AppName = "home" | "browser" | "mail" | "photos" | "messages";
export type Route = { app: AppName; view: string; id?: string };

const START_VIEW: Record<AppName, string> = { home: "home", browser: "home", mail: "list", photos: "grid", messages: "list" };

// Everything lives in memory only: reloading the page resets the practice phone.
export function Demo() {
  const phoneRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);

  const [route, setRoute] = useState<Route>({ app: "home", view: "home" });
  const [emails, setEmails] = useState(INITIAL_EMAILS);
  const [unsubscribed, setUnsubscribed] = useState<string[]>([]);
  const [photos, setPhotos] = useState(INITIAL_PHOTOS);
  const [threads, setThreads] = useState(INITIAL_THREADS);
  // Community center website: accounts exist only in memory for this visit.
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [browserHistory, setBrowserHistory] = useState<Route[]>([]);
  const lastBrowserRoute = useRef<Route>({ app: "browser", view: "home" });
  const [toastText, setToastText] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const toast = useCallback((text: string) => {
    setToastText(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastText(null), 2500);
  }, []);

  const go = useCallback((next: Route) => {
    setRoute(next);
    screenRef.current?.querySelector(".app-body")?.scrollTo({ top: 0 });
  }, []);

  // Like a real browser, the Internet app reopens on the last page you were on.
  const open = (app: AppName) => go(app === "browser" ? lastBrowserRoute.current : { app, view: START_VIEW[app] });

  const browserNav = (next: Route) => {
    setBrowserHistory((h) => [...h, route]);
    lastBrowserRoute.current = next;
    go(next);
  };

  const browserBack = () => {
    const previous = browserHistory.at(-1);
    if (!previous) return;
    setBrowserHistory((h) => h.slice(0, -1));
    lastBrowserRoute.current = previous;
    go(previous);
  };

  const user = accounts.find((a) => a.email === signedInEmail) ?? null;

  const send = (threadId: string, message: Omit<ChatMessage, "id" | "fromMe">) => {
    const add = (m: ChatMessage) => setThreads((ts) => ts.map((t) => (t.id === threadId ? { ...t, messages: [...t.messages, m] } : t)));
    add({ ...message, id: `sent-${Date.now()}`, fromMe: true });
    if (message.photoIds) {
      setTimeout(() => add({ id: `reply-${Date.now()}`, fromMe: false, text: "Oh, I love these! Thank you ❤️" }), 2500);
    }
  };

  return (
    <main className="stage">
      <div className="phone" ref={phoneRef}>
        <div className="status-bar" aria-hidden>
          <span>9:41</span>
          <span>📶 🔋</span>
        </div>
        <div className="screen" ref={screenRef}>
          {route.app === "home" && <Home open={open} toast={toast} />}
          {route.app === "browser" && (
            <EventsSite
              route={route}
              nav={browserNav}
              back={browserBack}
              canGoBack={browserHistory.length > 0}
              accounts={accounts}
              user={user}
              registrations={registrations}
              createAccount={(account) => {
                setAccounts((a) => [...a, account]);
                setSignedInEmail(account.email);
              }}
              signIn={setSignedInEmail}
              signOut={() => setSignedInEmail(null)}
              register={(r) => setRegistrations((rs) => [...rs.filter((x) => x.eventId !== r.eventId), r])}
              toast={toast}
            />
          )}
          {route.app === "mail" && (
            <MailApp
              route={route}
              go={go}
              emails={emails}
              updateEmails={setEmails}
              unsubscribed={unsubscribed}
              unsubscribe={(sender) => setUnsubscribed((u) => (u.includes(sender) ? u : [...u, sender]))}
              toast={toast}
            />
          )}
          {route.app === "photos" && (
            <PhotosApp
              route={route}
              go={go}
              photos={photos}
              deletePhotos={(ids) => setPhotos((ps) => ps.filter((p) => !ids.includes(p.id)))}
              toast={toast}
            />
          )}
          {route.app === "messages" && <MessagesApp route={route} go={go} threads={threads} photos={photos} send={send} toast={toast} />}
          {toastText && (
            <div className="toast" role="status" data-nora="notification" data-nora-type="notification">
              {toastText}
            </div>
          )}
        </div>
        <button className="home-bar" data-nora="home-button" aria-label="Home button at the very bottom (goes to the home screen)" onClick={() => go({ app: "home", view: "home" })}>
          <span aria-hidden>⌂</span> Home
        </button>
        <Nora phoneRef={phoneRef} screenRef={screenRef} />
      </div>
    </main>
  );
}
