import { useState, type ChangeEvent, type ReactNode } from "react";
import { EVENTS, type Account, type EventItem, type Registration } from "@/lib/data";
import type { Route } from "../Demo";

// The "Internet" app: a mobile browser showing the Maple Grove Community Center website.
// People browse dated events, and must sign in or create an account before registering.

type Props = {
  route: Route;
  nav: (route: Route) => void;
  back: () => void;
  canGoBack: boolean;
  accounts: Account[];
  user: Account | null;
  registrations: Registration[];
  createAccount: (account: Account) => void;
  signIn: (email: string) => void;
  signOut: () => void;
  register: (registration: Registration) => void;
  toast: (text: string) => void;
};

const SITE = "maplegrovecenter.org";
const page = (view: string, id?: string): Route => ({ app: "browser", view, id });

function addressFor(route: Route, event?: EventItem): string {
  switch (route.view) {
    case "event":
      return `${SITE}/events/${event?.slug}`;
    case "signin":
      return `${SITE}/sign-in`;
    case "create":
      return `${SITE}/create-account`;
    case "register":
      return `${SITE}/events/${event?.slug}/register`;
    case "confirmed":
      return `${SITE}/events/${event?.slug}/confirmed`;
    case "account":
      return `${SITE}/my-account`;
    default:
      return `${SITE}/events`;
  }
}

const PAGE_NAMES: Record<string, string> = {
  home: "events list",
  event: "event details",
  signin: "sign-in page",
  create: "create an account page",
  register: "registration form",
  confirmed: "registration confirmed",
  account: "my account page",
};

function spotsText(e: EventItem, registered: boolean): string {
  if (registered) return "You're registered";
  if (e.spotsLeft === 0) return "Full";
  return `${e.spotsLeft} ${e.spotsLeft === 1 ? "spot" : "spots"} left`;
}

export function EventsSite(props: Props) {
  const { route, nav, back, canGoBack, user, registrations, signOut, toast } = props;
  // A one-time message shown at the top of the next page, like "You're signed in".
  const [flash, setFlash] = useState<string | null>(null);

  const event = EVENTS.find((e) => e.id === route.id);
  const registrationFor = (id: string) => registrations.find((r) => r.eventId === id);

  const go = (next: Route, message: string | null = null) => {
    setFlash(message);
    nav(next);
  };

  let content: ReactNode;
  if (route.view === "event" && event) {
    content = <EventPage event={event} registration={registrationFor(event.id)} user={user} go={go} toast={toast} />;
  } else if (route.view === "signin") {
    content = <SignInPage key={`signin-${route.id}`} {...props} event={event} go={go} />;
  } else if (route.view === "create") {
    content = <CreateAccountPage key={`create-${route.id}`} {...props} event={event} go={go} />;
  } else if (route.view === "register" && event && user) {
    content = <RegisterPage key={event.id} event={event} user={user} register={props.register} go={go} />;
  } else if (route.view === "confirmed" && event && registrationFor(event.id)) {
    content = <ConfirmedPage event={event} registration={registrationFor(event.id)!} go={go} toast={toast} />;
  } else if (route.view === "account" && user) {
    content = (
      <AccountPage
        user={user}
        registrations={registrations}
        go={go}
        signOut={() => {
          signOut();
          go(page("home"), "You're signed out.");
        }}
      />
    );
  } else {
    content = <EventList registrations={registrations} user={user} go={go} />;
  }

  const pageName = PAGE_NAMES[route.view] ?? PAGE_NAMES.home;
  const eventPart = event && route.view !== "home" && route.view !== "account" ? ` for ${event.title}` : "";
  const who = user ? `signed in as ${user.firstName} ${user.lastName}` : "not signed in";

  return (
    <div
      className="app browser"
      data-nora-screen={`Internet app – Maple Grove Community Center website – ${pageName}${eventPart} (${who})`}
    >
      <div className="browser-bar">
        <button
          className="icon-btn browser-back"
          data-nora="browser-back-button"
          aria-label="Browser back arrow (goes to the previous web page)"
          disabled={!canGoBack}
          onClick={() => {
            setFlash(null);
            back();
          }}
        >
          ‹
        </button>
        <button
          className="address-bar"
          data-nora="address-bar"
          data-nora-label={`Web address bar showing ${addressFor(route, event)}`}
          onClick={() => toast("Typing web addresses isn't part of this practice phone.")}
        >
          <span aria-hidden>🔒</span>
          <span className="address-text">{addressFor(route, event)}</span>
        </button>
      </div>

      <div className="app-body site">
        <header className="site-header">
          <button className="site-logo" data-nora="site-logo" data-nora-label="Maple Grove Community Center logo (goes to the events list)" onClick={() => go(page("home"))}>
            <span className="site-logo-mark" aria-hidden>
              🍁
            </span>
            <span className="site-logo-text">
              Maple Grove
              <small>Community Center</small>
            </span>
          </button>
          {user ? (
            <button className="site-account-btn" data-nora="my-account-button" data-nora-label={`My account (signed in as ${user.firstName})`} onClick={() => go(page("account"))}>
              <span aria-hidden>👤</span> {user.firstName}
            </button>
          ) : (
            <button className="site-signin-btn" data-nora="header-sign-in-button" onClick={() => go(page("signin"))}>
              Sign in
            </button>
          )}
        </header>

        {flash && (
          <p className="site-flash" role="status" data-nora="site-message" data-nora-type="message">
            {flash}
          </p>
        )}

        <div className="site-content">{content}</div>

        <footer className="site-footer">
          <p>
            <strong>Maple Grove Community Center</strong>
            <br />
            120 Elm Street · (555) 014-2200
            <br />
            Open Monday to Saturday, 8 AM – 6 PM
          </p>
          <p className="site-practice">Practice website. Nothing you type is saved or sent.</p>
        </footer>
      </div>
    </div>
  );
}

type Go = (next: Route, message?: string | null) => void;

function EventList({ registrations, user, go }: { registrations: Registration[]; user: Account | null; go: Go }) {
  const dates = [...new Set(EVENTS.map((e) => e.date))];
  return (
    <>
      <section className="site-hero">
        <h1>Events &amp; Classes</h1>
        <p>{user ? `Welcome back, ${user.firstName}! Tap an event to see details and register.` : "Tap an event to see details. You'll need a free account to register."}</p>
      </section>
      {dates.map((date) => (
        <section key={date} className="site-day">
          <h2 className="site-day-title">{date}</h2>
          {EVENTS.filter((e) => e.date === date).map((e) => {
            const registered = registrations.some((r) => r.eventId === e.id);
            return (
              <button
                key={e.id}
                className="site-event-card"
                data-nora={`event-${e.id}`}
                data-nora-label={`${e.title}, ${e.date}, ${e.time}, ${e.place}, ${e.cost}, ${spotsText(e, registered)}`}
                onClick={() => go(page("event", e.id))}
              >
                <span className="site-event-emoji" style={{ background: e.color }} aria-hidden>
                  {e.emoji}
                </span>
                <span className="site-event-text">
                  <strong>{e.title}</strong>
                  <span>🕒 {e.time}</span>
                  <span>📍 {e.place}</span>
                  <span className={`site-spots${registered ? " ok" : e.spotsLeft === 0 ? " full" : ""}`}>
                    {registered ? "✓ " : ""}
                    {spotsText(e, registered)}
                    {e.cost !== "Free" && !registered ? ` · ${e.cost.split(",")[0]}` : ""}
                  </span>
                </span>
                <span className="site-chevron" aria-hidden>
                  ›
                </span>
              </button>
            );
          })}
        </section>
      ))}
    </>
  );
}

function EventPage({
  event,
  registration,
  user,
  go,
  toast,
}: {
  event: EventItem;
  registration?: Registration;
  user: Account | null;
  go: Go;
  toast: (text: string) => void;
}) {
  const full = event.spotsLeft === 0;
  return (
    <>
      <button className="site-crumb" data-nora="all-events-link" data-nora-type="link" onClick={() => go(page("home"))}>
        ‹ All events
      </button>
      <div className="site-banner" style={{ background: event.color }} aria-hidden>
        {event.emoji}
      </div>
      <h1 className="site-title" data-nora="event-title" data-nora-type="heading">
        {event.title}
      </h1>
      <dl className="site-facts" data-nora="event-facts" data-nora-type="event details" data-nora-label={`${event.date}, ${event.time}, at ${event.place}. Led by ${event.host}. Cost: ${event.cost}. ${full ? "Full" : `${event.spotsLeft} of ${event.capacity} spots left`}.`}>
        <dt>📅 Date</dt>
        <dd>{event.date}</dd>
        <dt>🕒 Time</dt>
        <dd>{event.time}</dd>
        <dt>📍 Where</dt>
        <dd>{event.place}</dd>
        <dt>👋 Led by</dt>
        <dd>{event.host}</dd>
        <dt>💲 Cost</dt>
        <dd>{event.cost}</dd>
        <dt>🪑 Spots</dt>
        <dd>{full ? "Full" : `${event.spotsLeft} of ${event.capacity} left`}</dd>
      </dl>
      {event.details.map((p) => (
        <p key={p} className="site-text">
          {p}
        </p>
      ))}

      {registration ? (
        <div className="site-box ok" data-nora="already-registered" data-nora-type="message">
          <strong>✓ You&apos;re registered for this event.</strong>
          <span>Confirmation number: {registration.confirmation}</span>
        </div>
      ) : full ? (
        <div className="site-box" data-nora="event-full-message" data-nora-type="message">
          <strong>This event is full.</strong>
          <span>Call the front desk at (555) 014-2200 to join the waiting list.</span>
        </div>
      ) : (
        <>
          {!user && (
            <p className="site-hint" data-nora="sign-in-needed-note" data-nora-type="message">
              You&apos;ll be asked to sign in or create a free account first.
            </p>
          )}
          <button
            className="btn btn-primary btn-wide site-cta"
            data-nora="register-button"
            onClick={() => (user ? go(page("register", event.id)) : go(page("signin", event.id)))}
          >
            Register for this event
          </button>
        </>
      )}
      <button className="btn btn-wide" data-nora="share-event-button" onClick={() => toast("Sharing isn't part of this practice phone.")}>
        Share this event
      </button>
    </>
  );
}

function PasswordToggle({ shown, setShown }: { shown: boolean; setShown: (v: boolean) => void }) {
  return (
    <label className="check-field">
      <input type="checkbox" data-nora="show-password-checkbox" checked={shown} onChange={(e) => setShown(e.target.checked)} />
      <span>Show password</span>
    </label>
  );
}

function SignInPage({
  event,
  accounts,
  signIn,
  go,
  toast,
}: Props & { event?: EventItem; go: Go }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(false);
  const [error, setError] = useState("");

  const submit = () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return setError("Please enter your email address.");
    if (!password) return setError("Please enter your password.");
    const account = accounts.find((a) => a.email === cleanEmail);
    if (!account) return setError("We couldn't find an account with that email address. Check the spelling, or create a new account below.");
    if (account.password !== password) return setError("That password isn't right. Please try again.");
    signIn(account.email);
    if (event) go(page("event", event.id), `You're signed in, ${account.firstName}. You can register now.`);
    else go(page("home"), `You're signed in. Welcome back, ${account.firstName}!`);
  };

  return (
    <form
      className="site-form"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h1 className="site-title">Sign in</h1>
      {event && (
        <p className="site-box" data-nora="sign-in-reason" data-nora-type="message">
          <span>
            Please sign in to register for <strong>{event.title}</strong>.
          </span>
        </p>
      )}
      <label className="field">
        <span>Email address</span>
        <input data-nora="email-box" type="email" inputMode="email" autoComplete="off" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="field">
        <span>Password</span>
        <input data-nora="password-box" data-nora-type="password box" type={shown ? "text" : "password"} autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <PasswordToggle shown={shown} setShown={setShown} />
      {error && (
        <p className="form-error" role="alert" data-nora="form-error" data-nora-type="error message">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-wide" data-nora="sign-in-button">
        Sign in
      </button>
      <button type="button" className="link-btn site-link" data-nora="forgot-password-link" data-nora-type="link" onClick={() => toast("Password reset isn't part of this practice website.")}>
        Forgot your password?
      </button>
      <div className="site-divider">
        <span>New to Maple Grove?</span>
      </div>
      <button type="button" className="btn btn-wide btn-outline" data-nora="create-account-button" onClick={() => go(page("create", event?.id))}>
        Create a free account
      </button>
    </form>
  );
}

function CreateAccountPage({
  event,
  accounts,
  createAccount,
  go,
  toast,
}: Props & { event?: EventItem; go: Go }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", confirm: "" });
  const [agreed, setAgreed] = useState(false);
  const [shown, setShown] = useState(false);
  const [error, setError] = useState("");
  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = () => {
    const email = form.email.trim().toLowerCase();
    if (!form.firstName.trim()) return setError("Please enter your first name.");
    if (!form.lastName.trim()) return setError("Please enter your last name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Please enter a full email address, like name@example.com.");
    if (accounts.some((a) => a.email === email)) return setError("There's already an account with this email address. Go back and sign in instead.");
    if (form.password.length < 8 || !/\d/.test(form.password)) return setError("Your password needs at least 8 characters, including at least one number.");
    if (form.password !== form.confirm) return setError("The two passwords don't match. Please type the same password in both boxes.");
    if (!agreed) return setError("Please check the box to agree to the community center rules.");
    const account = { firstName: form.firstName.trim(), lastName: form.lastName.trim(), email, phone: form.phone.trim(), password: form.password };
    createAccount(account);
    const welcome = `Welcome, ${account.firstName}! Your account is ready and you're signed in.`;
    if (event) go(page("event", event.id), `${welcome} You can register now.`);
    else go(page("home"), welcome);
  };

  return (
    <form
      className="site-form"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h1 className="site-title">Create your account</h1>
      <p className="site-text muted">It&apos;s free. You&apos;ll use your email and password to sign in next time.</p>
      <div className="field-row">
        <label className="field">
          <span>First name</span>
          <input data-nora="first-name-box" autoComplete="off" value={form.firstName} onChange={set("firstName")} />
        </label>
        <label className="field">
          <span>Last name</span>
          <input data-nora="last-name-box" autoComplete="off" value={form.lastName} onChange={set("lastName")} />
        </label>
      </div>
      <label className="field">
        <span>Email address</span>
        <input data-nora="new-email-box" type="email" inputMode="email" autoComplete="off" autoCapitalize="none" value={form.email} onChange={set("email")} />
      </label>
      <label className="field">
        <span>
          Phone number <span className="optional">(optional)</span>
        </span>
        <input data-nora="phone-box" type="tel" inputMode="tel" autoComplete="off" value={form.phone} onChange={set("phone")} />
      </label>
      <label className="field">
        <span>Create a password</span>
        <input data-nora="new-password-box" data-nora-type="password box" type={shown ? "text" : "password"} autoComplete="off" value={form.password} onChange={set("password")} />
        <small className="field-hint" data-nora="password-rules" data-nora-type="hint">
          At least 8 characters, including at least one number.
        </small>
      </label>
      <label className="field">
        <span>Type the password again</span>
        <input data-nora="confirm-password-box" data-nora-type="password box" type={shown ? "text" : "password"} autoComplete="off" value={form.confirm} onChange={set("confirm")} />
      </label>
      <PasswordToggle shown={shown} setShown={setShown} />
      <label className="check-field">
        <input type="checkbox" data-nora="agree-checkbox" data-nora-label="I agree to the community center rules" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span>
          I agree to the community center{" "}
          <button type="button" className="link-btn" data-nora="rules-link" data-nora-type="link" onClick={() => toast("The rules page isn't part of this practice website.")}>
            rules
          </button>
        </span>
      </label>
      {error && (
        <p className="form-error" role="alert" data-nora="form-error" data-nora-type="error message">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-wide" data-nora="create-account-submit">
        Create account
      </button>
      <button type="button" className="link-btn site-link" data-nora="have-account-link" data-nora-type="link" onClick={() => go(page("signin", event?.id))}>
        Already have an account? Sign in
      </button>
    </form>
  );
}

function RegisterPage({ event, user, register, go }: { event: EventItem; user: Account; register: (r: Registration) => void; go: Go }) {
  const [people, setPeople] = useState("1");
  const maxPeople = Math.min(3, event.spotsLeft);

  const submit = () => {
    const confirmation = `MG-${Math.floor(1000 + Math.random() * 9000)}`;
    register({ eventId: event.id, people: Number(people), confirmation });
    go(page("confirmed", event.id));
  };

  return (
    <form
      className="site-form"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h1 className="site-title">Register</h1>
      <div className="site-box" data-nora="registration-summary" data-nora-type="event details" data-nora-label={`${event.title}, ${event.date}, ${event.time}, ${event.place}, ${event.cost}`}>
        <strong>
          {event.emoji} {event.title}
        </strong>
        <span>
          {event.date}, {event.time}
        </span>
        <span>{event.place}</span>
        <span>Cost: {event.cost}</span>
      </div>
      <div className="field">
        <span>Registering as</span>
        <p className="site-readonly" data-nora="registering-as" data-nora-type="text">
          {user.firstName} {user.lastName} ({user.email})
        </p>
      </div>
      <label className="field">
        <span>How many people are coming, including you?</span>
        <select data-nora="people-menu" value={people} onChange={(e) => setPeople(e.target.value)}>
          {Array.from({ length: maxPeople }, (_, i) => (
            <option key={i} value={String(i + 1)}>
              {i === 0 ? "Just me" : `${i + 1} people`}
            </option>
          ))}
        </select>
      </label>
      <label className="check-field">
        <input type="checkbox" data-nora="reminder-checkbox" defaultChecked />
        <span>Email me a reminder the day before</span>
      </label>
      <button type="submit" className="btn btn-primary btn-wide" data-nora="confirm-registration-button">
        Confirm registration
      </button>
      <button type="button" className="btn btn-wide" data-nora="cancel-registration-button" onClick={() => go(page("event", event.id))}>
        Cancel
      </button>
    </form>
  );
}

function ConfirmedPage({ event, registration, go, toast }: { event: EventItem; registration: Registration; go: Go; toast: (text: string) => void }) {
  return (
    <div className="site-done">
      <div className="done-check" aria-hidden>
        ✅
      </div>
      <h1 className="site-title" data-nora="registration-confirmed" data-nora-type="heading">
        You&apos;re registered!
      </h1>
      <div className="site-box ok" data-nora="confirmation-details" data-nora-type="event details" data-nora-label={`${event.title}, ${event.date}, ${event.time}, ${event.place}. ${registration.people === 1 ? "Just you" : `${registration.people} people`}. Confirmation number ${registration.confirmation}.`}>
        <strong>
          {event.emoji} {event.title}
        </strong>
        <span>
          {event.date}, {event.time}
        </span>
        <span>{event.place}</span>
        <span>{registration.people === 1 ? "Just you" : `${registration.people} people`}</span>
        <span>
          Confirmation number: <strong>{registration.confirmation}</strong>
        </span>
      </div>
      <p className="site-text">See you there! If you can&apos;t make it, please call the front desk so someone else can have your spot.</p>
      <button className="btn btn-wide" data-nora="add-to-calendar-button" onClick={() => toast("Added to your calendar.")}>
        Add to my calendar
      </button>
      <button className="btn btn-primary btn-wide" data-nora="see-more-events-button" onClick={() => go(page("home"))}>
        See more events
      </button>
    </div>
  );
}

function AccountPage({ user, registrations, go, signOut }: { user: Account; registrations: Registration[]; go: Go; signOut: () => void }) {
  return (
    <>
      <h1 className="site-title">My account</h1>
      <div className="site-box" data-nora="account-details" data-nora-type="text" data-nora-label={`Signed in as ${user.firstName} ${user.lastName}, ${user.email}`}>
        <strong>
          {user.firstName} {user.lastName}
        </strong>
        <span>{user.email}</span>
      </div>
      <h2 className="site-day-title">My registrations</h2>
      {registrations.length === 0 && (
        <p className="site-text muted" data-nora="no-registrations" data-nora-type="text">
          You haven&apos;t registered for any events yet.
        </p>
      )}
      {registrations.map((r) => {
        const e = EVENTS.find((x) => x.id === r.eventId)!;
        return (
          <button key={r.eventId} className="site-event-card" data-nora={`my-event-${e.id}`} data-nora-label={`Registered: ${e.title}, ${e.date}, ${e.time}`} onClick={() => go(page("event", e.id))}>
            <span className="site-event-emoji" style={{ background: e.color }} aria-hidden>
              {e.emoji}
            </span>
            <span className="site-event-text">
              <strong>{e.title}</strong>
              <span>
                {e.date}, {e.time}
              </span>
              <span className="site-spots ok">✓ {r.confirmation}</span>
            </span>
          </button>
        );
      })}
      <button className="btn btn-wide" data-nora="sign-out-button" onClick={signOut}>
        Sign out
      </button>
    </>
  );
}
