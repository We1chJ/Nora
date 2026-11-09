import { useState } from "react";
import type { Photo } from "@/lib/data";
import { AppHeader, ConfirmDialog, PhotoTile } from "../ui";
import type { Route } from "../Demo";

type Props = {
  route: Route;
  go: (route: Route) => void;
  photos: Photo[];
  deletePhotos: (ids: string[]) => void;
  toast: (text: string) => void;
};

export function PhotosApp({ route, go, photos, deletePhotos, toast }: Props) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);

  const photo = photos.find((p) => p.id === route.id);

  if (route.view === "photo" && photo) {
    const back = () => go({ app: "photos", view: "grid" });
    return (
      <div className="app dark" data-nora-screen={`Photos – viewing one photo: ${photo.title}, ${photo.date}`}>
        <AppHeader
          title={photo.date}
          backLabel="Back to all photos"
          onBack={back}
          right={
            <>
              <button className="icon-btn" data-nora="favorite-button" aria-label="Favorite (heart)" onClick={() => toast("Added to Favorites")}>
                ♡
              </button>
              <button className="icon-btn" data-nora="share-button" aria-label="Share" onClick={() => toast("Sharing isn't part of this practice phone.")}>
                ⤴
              </button>
              <button className="icon-btn" data-nora="delete-photo-button" aria-label="Delete photo (trash can)" onClick={() => setConfirming(true)}>
                🗑️
              </button>
            </>
          }
        />
        <div className="app-body center">
          <div data-nora="current-photo" data-nora-label={`Photo: ${photo.title}, ${photo.date}`}>
            <PhotoTile emoji={photo.emoji} bg={photo.bg} size="lg" />
          </div>
          <p>{photo.title}</p>
        </div>
        {confirming && (
          <ConfirmDialog
            title="Delete this photo?"
            confirmLabel="Delete Photo"
            confirmId="confirm-delete-photo"
            danger
            onCancel={() => setConfirming(false)}
            onConfirm={() => {
              setConfirming(false);
              deletePhotos([photo.id]);
              toast("Photo deleted");
              back();
            }}
          />
        )}
      </div>
    );
  }

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const stopSelecting = () => {
    setSelecting(false);
    setSelected([]);
  };

  return (
    <div className="app" data-nora-screen={selecting ? "Photos – choosing photos (select mode)" : "Photos – all photos"}>
      <AppHeader
        title={selecting ? `${selected.length} selected` : "Photos"}
        backLabel="Back to home screen"
        onBack={selecting ? undefined : () => go({ app: "home", view: "home" })}
        right={
          selecting ? (
            <button className="text-btn" data-nora="cancel-select-button" onClick={stopSelecting}>
              Cancel
            </button>
          ) : (
            <button className="text-btn" data-nora="select-button" onClick={() => setSelecting(true)}>
              Select
            </button>
          )
        }
      />
      <div className="app-body flush">
        <div className="photo-grid">
          {photos.map((p) => {
            const isSelected = selected.includes(p.id);
            return (
              <button
                key={p.id}
                className={`photo-cell${isSelected ? " selected" : ""}`}
                data-nora={`photo-${p.id}`}
                data-nora-label={`Photo: ${p.title}, ${p.date}${selecting ? (isSelected ? " (selected)" : " (not selected)") : ""}`}
                onClick={() => (selecting ? toggle(p.id) : go({ app: "photos", view: "photo", id: p.id }))}
              >
                <PhotoTile emoji={p.emoji} bg={p.bg} />
                {isSelected && <span className="check">✓</span>}
              </button>
            );
          })}
        </div>
        <p className="photo-count muted" data-nora="photo-count">
          {photos.length} Photos
        </p>
      </div>
      {selecting && (
        <div className="bottom-toolbar">
          <button
            className="icon-btn"
            data-nora="delete-selected-button"
            aria-label="Delete selected photos (trash can)"
            disabled={selected.length === 0}
            onClick={() => setConfirming(true)}
          >
            🗑️
          </button>
        </div>
      )}
      {confirming && (
        <ConfirmDialog
          title={`Delete ${selected.length} ${selected.length === 1 ? "photo" : "photos"}?`}
          confirmLabel="Delete"
          confirmId="confirm-delete-photos"
          danger
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            deletePhotos(selected);
            toast(`${selected.length} ${selected.length === 1 ? "photo" : "photos"} deleted`);
            stopSelecting();
          }}
        />
      )}
    </div>
  );
}
