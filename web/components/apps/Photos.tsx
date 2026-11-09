import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { Photo } from "@/lib/photos";
import type { Route } from "../Demo";
import "@/app/photos.css";

// A Google Photos-style gallery: date-grouped grid, long-press or circle selection, a photo viewer
// you can swipe through, "Move to bin" with Undo, and Collections (Favorites, Bin) and Search tabs.

type Props = {
  route: Route;
  go: (route: Route) => void;
  photos: Photo[];
  bin: Photo[];
  moveToBin: (ids: string[]) => void;
  restore: (ids: string[]) => void;
  deleteForever: (ids: string[]) => void;
  toggleFavorite: (id: string) => void;
  /** Opens the share sheet. Wired up by the Messages app. */
  share?: (ids: string[]) => void;
  toast: (text: string) => void;
};

const page = (view: string, id?: string): Route => ({ app: "photos", view, id });
const items = (n: number) => `${n} ${n === 1 ? "item" : "items"}`;

/** Undo bar that appears after moving photos to the bin. */
type Undo = { ids: string[]; text: string } | null;

export function PhotosApp(props: Props) {
  const { route, go, photos, bin, toast } = props;
  const [undo, setUndo] = useState<Undo>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const toBin = (ids: string[]) => {
    props.moveToBin(ids);
    setUndo({ ids, text: `${items(ids.length)} moved to bin` });
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 7000);
  };
  useEffect(() => () => clearTimeout(undoTimer.current), []);

  const undoBar = undo && (
    <div className="gp-snackbar" role="status" data-nora="undo-bar">
      <span>{undo.text}</span>
      <button
        className="gp-snackbar-btn"
        data-nora="undo-button"
        onClick={() => {
          props.restore(undo.ids);
          setUndo(null);
        }}
      >
        Undo
      </button>
    </div>
  );

  const libraryPhoto = photos.find((p) => p.id === route.id);
  const binPhoto = bin.find((p) => p.id === route.id);

  if (route.view === "photo" && libraryPhoto) {
    return (
      <>
        <Viewer
          key="library"
          list={photos}
          photo={libraryPhoto}
          go={go}
          onBack={() => go(page("grid"))}
          actions={(p, next) => [
            { id: "share-button", icon: "share", label: "Share", onClick: () => (props.share ? props.share([p.id]) : toast("Sharing isn't ready yet.")) },
            { id: "edit-button", icon: "edit", label: "Edit", onClick: () => toast("Editing isn't part of this practice phone.") },
            { id: "favorite-button", icon: p.favorite ? "star-filled" : "star", label: p.favorite ? "Favorited" : "Favorite", onClick: () => props.toggleFavorite(p.id) },
            {
              id: "delete-button",
              icon: "trash",
              label: "Delete",
              confirm: {
                title: "Move to bin?",
                body: "Items in your bin will be permanently deleted after 60 days.",
                confirmLabel: "Move to bin",
                confirmId: "confirm-move-to-bin",
              },
              onClick: () => {
                toBin([p.id]);
                next();
              },
            },
          ]}
        />
        {undoBar}
      </>
    );
  }

  if (route.view === "binphoto" && binPhoto) {
    return (
      <Viewer
        key="bin"
        list={bin}
        photo={binPhoto}
        go={go}
        viewName="binphoto"
        onBack={() => go(page("bin"))}
        actions={(p, next) => [
          {
            id: "restore-button",
            icon: "restore",
            label: "Restore",
            onClick: () => {
              props.restore([p.id]);
              toast("Photo restored");
              next();
            },
          },
          {
            id: "delete-forever-button",
            icon: "trash",
            label: "Delete",
            confirm: {
              title: "Permanently delete?",
              body: "This photo will be gone for good. You can't undo this.",
              confirmLabel: "Delete",
              confirmId: "confirm-delete-forever",
              danger: true,
            },
            onClick: () => {
              props.deleteForever([p.id]);
              toast("Photo permanently deleted");
              next();
            },
          },
        ]}
      />
    );
  }

  if (route.view === "bin") {
    return <BinPage bin={bin} go={go} deleteForever={props.deleteForever} toast={toast} />;
  }

  if (route.view === "favorites") {
    const favorites = photos.filter((p) => p.favorite);
    return (
      <div className="app gp" data-nora-screen="Photos – Favorites">
        <SubHeader title="Favorites" onBack={() => go(page("collections"))} />
        <div className="app-body gp-body">
          {favorites.length === 0 ? (
            <p className="gp-empty">No favorites yet. Open a photo and tap the star to add it here.</p>
          ) : (
            <PhotoGrid photos={favorites} onOpen={(p) => go(page("photo", p.id))} />
          )}
        </div>
      </div>
    );
  }

  return (
    <MainTabs
      tab={route.view === "collections" ? "collections" : route.view === "search" ? "search" : "photos"}
      photos={photos}
      bin={bin}
      go={go}
      toBin={toBin}
      share={props.share}
      toast={toast}
      undoBar={undoBar}
    />
  );
}

/* ---------- Main tabs: Photos, Collections, Search ---------- */

function MainTabs({
  tab,
  photos,
  bin,
  go,
  toBin,
  share,
  toast,
  undoBar,
}: {
  tab: "photos" | "collections" | "search";
  photos: Photo[];
  bin: Photo[];
  go: (route: Route) => void;
  toBin: (ids: string[]) => void;
  share?: (ids: string[]) => void;
  toast: (text: string) => void;
  undoBar: ReactNode;
}) {
  const [selected, setSelected] = useState<string[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [query, setQuery] = useState("");
  const selecting = selected !== null;

  const toggle = (id: string) =>
    setSelected((s) => {
      const cur = s ?? [];
      return cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    });
  const stopSelecting = () => setSelected(null);

  const shown =
    tab === "search"
      ? query.trim()
        ? photos.filter((p) => `${p.title} ${p.tags} ${p.day}`.toLowerCase().includes(query.trim().toLowerCase()))
        : []
      : photos;

  const screenName =
    tab === "collections"
      ? "Photos – Collections tab"
      : tab === "search"
        ? "Photos – Search tab"
        : selecting
          ? `Photos – choosing photos (${selected.length} selected)`
          : "Photos – Photos tab (all photos, newest first)";

  return (
    <div className="app gp" data-nora-screen={screenName}>
      {selecting ? (
        <header className="gp-topbar selecting">
          <button className="gp-icon-btn" data-nora="cancel-select-button" aria-label="Stop selecting (X)" onClick={stopSelecting}>
            <Icon name="close" />
          </button>
          <span className="gp-selected-count" data-nora="selected-count">
            {selected.length === 0 ? "Select photos" : `${selected.length} selected`}
          </span>
        </header>
      ) : (
        <header className="gp-topbar">
          <span className="gp-wordmark">{tab === "collections" ? "Collections" : tab === "search" ? "Search" : "Photos"}</span>
          {tab === "photos" && (
            <button className="gp-select-btn" data-nora="select-button" onClick={() => setSelected([])}>
              Select
            </button>
          )}
          <button className="gp-avatar" data-nora="account-button" aria-label="Your account" onClick={() => toast("Account settings aren't part of this practice phone.")}>
            M
          </button>
        </header>
      )}

      <div className="app-body gp-body">
        {tab === "collections" ? (
          <Collections photos={photos} bin={bin} go={go} toast={toast} />
        ) : (
          <>
            {tab === "search" && (
              <div className="gp-search">
                <input
                  className="gp-search-input"
                  data-nora="search-box"
                  type="search"
                  placeholder="Search your photos"
                  aria-label="Search your photos"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {!query.trim() && (
                  <div className="gp-chips">
                    {["Dogs", "Food", "Flowers", "Nature"].map((c) => (
                      <button key={c} className="gp-chip" data-nora={`search-${c.toLowerCase()}`} onClick={() => setQuery(c.toLowerCase().replace(/s$/, ""))}>
                        {c}
                      </button>
                    ))}
                  </div>
                )}
                {query.trim() && shown.length === 0 && <p className="gp-empty">No photos match “{query.trim()}”.</p>}
              </div>
            )}
            <PhotoGrid
              photos={shown}
              grouped={tab === "photos"}
              selected={selected}
              onOpen={(p) => go(page("photo", p.id))}
              onToggle={toggle}
              onLongPress={(p) => setSelected((s) => (s ? (s.includes(p.id) ? s : [...s, p.id]) : [p.id]))}
              onToggleDay={(ids) =>
                setSelected((s) => {
                  const cur = s ?? [];
                  const all = ids.every((id) => cur.includes(id));
                  return all ? cur.filter((id) => !ids.includes(id)) : [...new Set([...cur, ...ids])];
                })
              }
            />
            {tab === "photos" && (
              <p className="gp-footnote" data-nora="photo-count">
                {photos.length} photos
              </p>
            )}
          </>
        )}
      </div>

      {undoBar}

      {selecting ? (
        <nav className="gp-actionbar" aria-label="Actions for selected photos">
          <ActionButton
            id="share-selected-button"
            icon="share"
            label="Share"
            disabled={selected.length === 0}
            onClick={() => (share ? share(selected) : toast("Sharing isn't ready yet."))}
          />
          <ActionButton id="add-to-button" icon="add" label="Add to" disabled={selected.length === 0} onClick={() => toast("Albums aren't part of this practice phone.")} />
          <ActionButton id="delete-selected-button" icon="trash" label="Delete" disabled={selected.length === 0} onClick={() => setConfirming(true)} />
        </nav>
      ) : (
        <nav className="gp-tabbar" aria-label="Photos sections">
          <TabButton id="tab-photos" icon="photos" label="Photos" active={tab === "photos"} onClick={() => go(page("grid"))} />
          <TabButton id="tab-collections" icon="collections" label="Collections" active={tab === "collections"} onClick={() => go(page("collections"))} />
          <TabButton id="tab-search" icon="search" label="Search" active={tab === "search"} onClick={() => go(page("search"))} />
        </nav>
      )}

      {confirming && selected && (
        <Sheet
          title={`Move ${items(selected.length)} to bin?`}
          body="Items in your bin will be permanently deleted after 60 days."
          confirmLabel="Move to bin"
          confirmId="confirm-move-to-bin"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            toBin(selected);
            stopSelecting();
          }}
        />
      )}
    </div>
  );
}

/* ---------- Grid ---------- */

function PhotoGrid({
  photos,
  grouped = false,
  selected = null,
  onOpen,
  onToggle,
  onLongPress,
  onToggleDay,
}: {
  photos: Photo[];
  grouped?: boolean;
  selected?: string[] | null;
  onOpen: (p: Photo) => void;
  onToggle?: (id: string) => void;
  onLongPress?: (p: Photo) => void;
  onToggleDay?: (ids: string[]) => void;
}) {
  const selecting = selected !== null;
  const groups: { day: string; photos: Photo[] }[] = [];
  for (const p of photos) {
    const key = grouped ? p.day : "";
    const last = groups.at(-1);
    if (last && last.day === key) last.photos.push(p);
    else groups.push({ day: key, photos: [p] });
  }

  return (
    <>
      {groups.map((g) => {
        const ids = g.photos.map((p) => p.id);
        const allSelected = selecting && ids.every((id) => selected.includes(id));
        return (
          <section key={g.day || "all"} className="gp-day">
            {g.day && (
              <div className="gp-day-header">
                {selecting && onToggleDay && (
                  <button
                    className={`gp-circle${allSelected ? " on" : ""}`}
                    data-nora={`select-day-${g.day}`}
                    aria-label={`${allSelected ? "Unselect" : "Select"} all photos from ${g.day}`}
                    onClick={() => onToggleDay(ids)}
                  >
                    {allSelected && <Icon name="check" />}
                  </button>
                )}
                <h2>{g.day}</h2>
              </div>
            )}
            <div className="gp-grid">
              {g.photos.map((p) => (
                <Tile
                  key={p.id}
                  photo={p}
                  selecting={selecting}
                  isSelected={selecting && selected.includes(p.id)}
                  onTap={() => (selecting && onToggle ? onToggle(p.id) : onOpen(p))}
                  onLongPress={onLongPress ? () => onLongPress(p) : undefined}
                />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

function Tile({
  photo,
  selecting,
  isSelected,
  onTap,
  onLongPress,
}: {
  photo: Photo;
  selecting: boolean;
  isSelected: boolean;
  onTap: () => void;
  onLongPress?: () => void;
}) {
  // Long-press (half a second without moving) starts selecting, like a real phone.
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const start = useRef<{ x: number; y: number } | null>(null);
  const longPressed = useRef(false);

  const down = (e: ReactPointerEvent) => {
    if (!onLongPress) return;
    longPressed.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    timer.current = setTimeout(() => {
      longPressed.current = true;
      onLongPress();
      navigator.vibrate?.(30);
    }, 500);
  };
  const cancel = () => clearTimeout(timer.current);
  const move = (e: ReactPointerEvent) => {
    if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) cancel();
  };

  return (
    <button
      className={`gp-tile${isSelected ? " selected" : ""}`}
      data-nora={`photo-${photo.id}`}
      aria-label={`Photo taken ${photo.taken}${selecting ? (isSelected ? ", selected" : ", not selected") : ""}`}
      onPointerDown={down}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onPointerMove={move}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (longPressed.current) {
          longPressed.current = false;
          return;
        }
        onTap();
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- small local practice images */}
      <img src={photo.thumb} alt="" draggable={false} />
      {selecting && <span className={`gp-circle on-photo${isSelected ? " on" : ""}`}>{isSelected && <Icon name="check" />}</span>}
      {!selecting && photo.favorite && (
        <span className="gp-fav-badge" aria-hidden>
          <Icon name="star-filled" />
        </span>
      )}
    </button>
  );
}

/* ---------- Viewer ---------- */

type ViewerAction = {
  id: string;
  icon: IconName;
  label: string;
  onClick: () => void;
  confirm?: { title: string; body: string; confirmLabel: string; confirmId: string; danger?: boolean };
};

function Viewer({
  list,
  photo,
  go,
  onBack,
  actions,
  viewName = "photo",
}: {
  list: Photo[];
  photo: Photo;
  go: (route: Route) => void;
  onBack: () => void;
  /** Builds the bottom buttons; `next` moves on after the current photo is removed. */
  actions: (p: Photo, next: () => void) => ViewerAction[];
  viewName?: string;
}) {
  const [confirming, setConfirming] = useState<ViewerAction | null>(null);
  const [dragX, setDragX] = useState(0);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const index = list.findIndex((p) => p.id === photo.id);
  const prev = list[index - 1];
  const nextPhoto = list[index + 1];

  const show = (p?: Photo) => p && go(page(viewName, p.id));
  // After this photo leaves the list, show the next one (or the previous, or go back).
  const next = () => {
    const after = nextPhoto ?? prev;
    if (after) go(page(viewName, after.id));
    else onBack();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") show(nextPhoto);
      if (e.key === "ArrowLeft") show(prev);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const end = () => {
    if (dragX < -60) show(nextPhoto);
    else if (dragX > 60) show(prev);
    drag.current = null;
    setDragX(0);
  };

  const buttons = actions(photo, next);

  return (
    <div className="app gp-viewer" data-nora-screen={`Photos – viewing one photo (${index + 1} of ${list.length}), taken ${photo.taken}`}>
      <header className="gp-viewer-top">
        <button className="gp-icon-btn light" data-nora="back-button" aria-label="Back to all photos (arrow)" onClick={onBack}>
          <Icon name="back" />
        </button>
        <span className="gp-viewer-date">{photo.taken}</span>
      </header>
      <div
        className="gp-stage"
        data-nora="current-photo"
        onPointerDown={(e) => (drag.current = { x: e.clientX, y: e.clientY })}
        onPointerMove={(e) => drag.current && setDragX(e.clientX - drag.current.x)}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerLeave={() => drag.current && end()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- small local practice images */}
        <img
          key={photo.id}
          src={photo.src}
          alt={`Photo taken ${photo.taken}`}
          draggable={false}
          style={{ transform: dragX ? `translateX(${dragX}px)` : undefined, transition: dragX ? "none" : undefined }}
        />
      </div>
      <nav className="gp-viewer-actions" aria-label="Photo actions">
        {buttons.map((a) => (
          <ActionButton key={a.id} id={a.id} icon={a.icon} label={a.label} light onClick={() => (a.confirm ? setConfirming(a) : a.onClick())} />
        ))}
      </nav>
      {confirming?.confirm && (
        <Sheet
          {...confirming.confirm}
          onCancel={() => setConfirming(null)}
          onConfirm={() => {
            const action = confirming;
            setConfirming(null);
            action.onClick();
          }}
        />
      )}
    </div>
  );
}

/* ---------- Collections and Bin ---------- */

function Collections({ photos, bin, go, toast }: { photos: Photo[]; bin: Photo[]; go: (route: Route) => void; toast: (text: string) => void }) {
  const favorites = photos.filter((p) => p.favorite);
  return (
    <div className="gp-collections">
      <div className="gp-collection-row">
        <button className="gp-collection" data-nora="favorites-collection" onClick={() => go(page("favorites"))}>
          <span className="gp-collection-icon fav">
            <Icon name="star" />
          </span>
          <span className="gp-collection-text">
            <strong>Favorites</strong>
            <span>{items(favorites.length)}</span>
          </span>
        </button>
        <button className="gp-collection" data-nora="bin-collection" onClick={() => go(page("bin"))}>
          <span className="gp-collection-icon bin">
            <Icon name="trash" />
          </span>
          <span className="gp-collection-text">
            <strong>Bin</strong>
            <span>{items(bin.length)}</span>
          </span>
        </button>
      </div>
      <h2 className="gp-section-title">Albums</h2>
      <button className="gp-new-album" data-nora="new-album-button" onClick={() => toast("Albums aren't part of this practice phone.")}>
        <span className="gp-new-album-plus">
          <Icon name="add" />
        </span>
        New album
      </button>
    </div>
  );
}

function BinPage({ bin, go, deleteForever, toast }: { bin: Photo[]; go: (route: Route) => void; deleteForever: (ids: string[]) => void; toast: (text: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="app gp" data-nora-screen={`Photos – Bin (${items(bin.length)})`}>
      <SubHeader
        title="Bin"
        onBack={() => go(page("collections"))}
        right={
          bin.length > 0 && (
            <button className="gp-text-btn" data-nora="empty-bin-button" onClick={() => setConfirming(true)}>
              Empty bin
            </button>
          )
        }
      />
      <div className="app-body gp-body">
        <p className="gp-note">Items in the bin will be permanently deleted after 60 days. Tap a photo to restore it.</p>
        {bin.length === 0 ? <p className="gp-empty">Nothing in the bin.</p> : <PhotoGrid photos={bin} onOpen={(p) => go(page("binphoto", p.id))} />}
      </div>
      {confirming && (
        <Sheet
          title="Empty the bin?"
          body={`All ${items(bin.length)} will be permanently deleted. You can't undo this.`}
          confirmLabel="Empty bin"
          confirmId="confirm-empty-bin"
          danger
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            deleteForever(bin.map((p) => p.id));
            toast("Bin emptied");
          }}
        />
      )}
    </div>
  );
}

/* ---------- Small pieces ---------- */

function SubHeader({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <header className="gp-topbar sub">
      <button className="gp-icon-btn" data-nora="back-button" aria-label="Back (arrow)" onClick={onBack}>
        <Icon name="back" />
      </button>
      <span className="gp-sub-title">{title}</span>
      {right}
    </header>
  );
}

function Sheet({
  title,
  body,
  confirmLabel,
  confirmId,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  confirmId: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="gp-sheet-backdrop" onClick={onCancel}>
      <div className="gp-sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2 data-nora="dialog-title">{title}</h2>
        <p data-nora="dialog-message">{body}</p>
        <div className="gp-sheet-actions">
          <button className="gp-sheet-btn" data-nora="dialog-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className={`gp-sheet-btn primary${danger ? " danger" : ""}`} data-nora={confirmId} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ id, icon, label, onClick, disabled, light }: { id: string; icon: IconName; label: string; onClick: () => void; disabled?: boolean; light?: boolean }) {
  return (
    <button className={`gp-action${light ? " light" : ""}`} data-nora={id} disabled={disabled} onClick={onClick}>
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
}

function TabButton({ id, icon, label, active, onClick }: { id: string; icon: IconName; label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={`gp-tab${active ? " active" : ""}`} data-nora={id} aria-current={active ? "page" : undefined} onClick={onClick}>
      <span className="gp-tab-pill">
        <Icon name={icon} />
      </span>
      <span>{label}</span>
    </button>
  );
}

type IconName = "photos" | "collections" | "search" | "share" | "edit" | "star" | "star-filled" | "trash" | "add" | "close" | "check" | "back" | "restore";

// Simple line icons in the style of Material Symbols, drawn here so no icon font is needed.
const PATHS: Record<IconName, string> = {
  photos: "M4 5h16v14H4z M4 15l4-4 4 4 3-3 5 5 M15.5 9.5a1.5 1.5 0 1 0 0-.01",
  collections: "M7 3h10v4H7z M4 8h16v13H4z",
  search: "M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z M15.5 15.5L21 21",
  share: "M18 5a2 2 0 1 0 0 .01 M6 12a2 2 0 1 0 0 .01 M18 19a2 2 0 1 0 0 .01 M8 11l8-5 M8 13l8 5",
  edit: "M4 20h4L19 9l-4-4L4 16z M13 7l4 4",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z",
  "star-filled": "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z",
  trash: "M5 7h14 M10 7V4h4v3 M7 7l1 13h8l1-13 M10 11v6 M14 11v6",
  add: "M12 5v14 M5 12h14",
  close: "M6 6l12 12 M18 6L6 18",
  check: "M5 12.5l4.5 4.5L19 7.5",
  back: "M20 12H5 M11 6l-6 6 6 6",
  restore: "M4 12a8 8 0 1 0 2.4-5.7 M4 4v5h5 M12 8v4l3 2",
};

function Icon({ name }: { name: IconName }) {
  const filled = name === "star-filled";
  return (
    <svg className="gp-icon" viewBox="0 0 24 24" aria-hidden fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 1.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name]} />
    </svg>
  );
}
