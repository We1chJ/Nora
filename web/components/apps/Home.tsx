import type { AppName } from "../Demo";

const APPS: { app: AppName; label: string; icon: string; color: string }[] = [
  { app: "browser", label: "Internet", icon: "🌐", color: "#1a8fd8" },
  { app: "mail", label: "Mail", icon: "✉️", color: "#3478f6" },
  { app: "photos", label: "Photos", icon: "🖼️", color: "#e9496f" },
  { app: "messages", label: "Messages", icon: "💬", color: "#34c759" },
];

const DECOYS = [
  { id: "phone", label: "Phone", icon: "📞", color: "#2fb35a" },
  { id: "camera", label: "Camera", icon: "📷", color: "#6b7280" },
  { id: "weather", label: "Weather", icon: "⛅", color: "#4aa3df" },
  { id: "settings", label: "Settings", icon: "⚙️", color: "#8e8e93" },
];

export function Home({ open, toast }: { open: (app: AppName) => void; toast: (text: string) => void }) {
  return (
    <div className="app home" data-nora-screen="Home screen">
      <div className="home-clock">
        <div className="home-time">9:41</div>
        <div className="home-date">Monday, November 9</div>
      </div>
      <div className="app-grid">
        {APPS.map((a) => (
          <button key={a.app} className="app-icon" data-nora={`app-${a.app}`} aria-label={`${a.label} app`} onClick={() => open(a.app)}>
            <span className="app-icon-img" style={{ background: a.color }}>
              {a.icon}
            </span>
            <span className="app-icon-label">{a.label}</span>
          </button>
        ))}
        {DECOYS.map((d) => (
          <button
            key={d.id}
            className="app-icon"
            data-nora={`app-${d.id}`}
            aria-label={`${d.label} app (not part of this practice phone)`}
            onClick={() => toast(`${d.label} isn't part of this practice phone.`)}
          >
            <span className="app-icon-img" style={{ background: d.color }}>
              {d.icon}
            </span>
            <span className="app-icon-label">{d.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
