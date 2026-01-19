"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type BoardRef = { id: string; title: string };

const STOCKS = [
  "/Backgrounds/Default.jpg",
  "/Backgrounds/aj-FjDaN9WlRLg-unsplash.jpg",
  "/Backgrounds/aritra-roy-mEjphVjP3hA-unsplash.jpg",
  "/Backgrounds/barb-canale-YDG0lDHz9PI-unsplash.jpg",
  "/Backgrounds/clement-fusil-Fpqx6GGXfXs-unsplash.jpg",
  "/Backgrounds/elizeu-dias-RN6ts8IZ4_0-unsplash.jpg",
  "/Backgrounds/gayatri-malhotra-P9gkfbaxMTU-unsplash.jpg",
  "/Backgrounds/lukas-blazek-GnvurwJsKaY-unsplash.jpg",
  "/Backgrounds/maxxup-B2I9jm2bDlE-unsplash.jpg",
  "/Backgrounds/sean-oulashin-KMn4VEeEPR8-unsplash.jpg",
  "/Backgrounds/social-mode-WmVtCFR1C1g-unsplash.jpg",
  "/Backgrounds/tianyi-ma-j1Fv6s4jwXI-unsplash.jpg",
];

export default function BoardToolbar({
  boards,
  currentBoardId,
  boardTitle,
  onBackgroundChanged,
}: {
  boards: BoardRef[];
  currentBoardId: string;
  boardTitle: string;
  onBackgroundChanged?: (url: string) => void;
}) {
  const router = useRouter();
  const [openBg, setOpenBg] = useState(false);
  const bgMenuWrapRef = useRef<HTMLDivElement | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [openSettings, setOpenSettings] = useState(false);
  const settingsWrapRef = useRef<HTMLDivElement | null>(null);
  const [openArchives, setOpenArchives] = useState(false);
  const [archives, setArchives] = useState<Array<{ id: string; title: string; listId: string | null; listTitle: string }>>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/auth/me");
        const j = await r.json().catch(() => ({}));
        if (!alive) return;
        setIsAdmin(r.ok ? !!j?.user?.isAdmin : false);
      } catch {
        if (!alive) return;
        setIsAdmin(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Close Change background menu on outside click or Escape
  useEffect(() => {
    if (!openBg) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      const container = bgMenuWrapRef.current;
      if (container && !container.contains(target)) {
        setOpenBg(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenBg(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openBg]);

  useEffect(() => {
    if (!openSettings) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      const container = settingsWrapRef.current;
      if (container && !container.contains(target)) {
        setOpenSettings(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenSettings(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openSettings]);

  useEffect(() => {
    if (!openArchives) return;
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/boards/${currentBoardId}/archives`);
        const j = await r.json();
        if (!alive) return;
        setArchives(Array.isArray(j) ? j : []);
      } catch {
        if (!alive) return;
        setArchives([]);
      }
    })();
    return () => { alive = false; };
  }, [openArchives, currentBoardId]);

  const toProxy = (u: string) => (u && u.startsWith("http") ? `/api/image-proxy?url=${encodeURIComponent(u)}` : u);

  async function changeBackground(url: string) {
    try {
      // Optimistically change local background without a full refresh
      onBackgroundChanged?.(url);
      await fetch(`/api/boards/${currentBoardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ background: url }),
      });
      // No blocking refresh; UI already reflects change
    } catch (err) {
      console.error("Failed to change background", err);
      // As a fallback, try a soft refresh to reconcile
      try { router.refresh(); } catch {}
    }
  }

  return (
    <div className="sticky top-10 -mt-px z-30 w-full bg-white/60 dark:bg-black/40 backdrop-blur supports-[backdrop-filter]:bg-background/40 border-b border-black/10 dark:border-white/15">
      <div className="mx-auto max-w-7xl px-4 h-10 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <select
            value={currentBoardId}
            onChange={(e) => router.push(`/boards/${e.target.value}`)}
            className="text-xs rounded px-2 py-1 bg-background text-foreground dark:bg-black dark:text-white border border-black/10 dark:border-white/20"
            title="Switch board"
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id} className="dark:bg-black dark:text-white">{b.title}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative" ref={bgMenuWrapRef}>
            <button
              onClick={() => setOpenBg((v) => !v)}
              className="flex items-center justify-center text-xs rounded px-2 py-1 bg-background text-foreground border border-black/10 dark:border-white/15 hover:bg-foreground hover:text-background"
              title="Change background"
            >
              <span className="block sm:hidden">BG</span>
              <span className="hidden sm:inline">Change background</span>
            </button>
            {openBg && (
              <div className="absolute right-0 mt-2 w-64 rounded border border-black/10 dark:border-white/15 bg-background p-2 shadow">
                <div className="grid grid-cols-2 gap-2">
                  {STOCKS.map((u) => (
                    <button
                      key={u}
                      className="h-20 rounded overflow-hidden border border-black/10 dark:border-white/15"
                      onClick={() => {
                        changeBackground(u);
                        setOpenBg(false);
                      }}
                      style={{ backgroundImage: `url(${toProxy(u)})`, backgroundSize: "cover", backgroundPosition: "center" }}
                      aria-label="Pick background"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="relative" ref={settingsWrapRef}>
            <button
              onClick={() => setOpenSettings((v) => !v)}
              className="flex items-center justify-center text-xs rounded px-2 py-1 bg-background text-foreground border border-black/10 dark:border-white/15 hover:bg-foreground hover:text-background"
              title="Board settings"
            >
              <span className="block sm:hidden">⚙</span>
              <span className="hidden sm:inline">Board settings</span>
            </button>
            {openSettings && (
              <div className="absolute right-0 mt-2 w-48 rounded border border-black/10 dark:border-white/15 bg-background p-2 shadow">
                <button onClick={() => { setOpenSettings(false); setOpenArchives(true); }} className="block w-full text-left text-xs rounded px-2 py-1 hover:bg-foreground/5">Archives</button>
              </div>
            )}
          </div>
        </div>
      </div>
      {openArchives && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setOpenArchives(false); }}>
          <div className="w-full max-w-lg rounded border border-black/10 dark:border-white/15 bg-background p-4 shadow">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Archives</p>
              <button className="text-xs rounded px-2 py-1 bg-foreground/5 hover:bg-foreground/10" onClick={() => setOpenArchives(false)}>Close</button>
            </div>
            <div className="mt-3 max-h-[60vh] overflow-y-auto">
              {archives.length === 0 ? (
                <p className="text-xs text-foreground/60">No archived cards</p>
              ) : (
                <ul className="space-y-2">
                  {archives.map((c) => (
                    <li key={c.id}>
                      <button
                        className="w-full text-left rounded px-3 py-2 border bg-background hover:bg-foreground/5 text-sm"
                        onClick={() => { setOpenArchives(false); router.push(`/boards/${currentBoardId}?openCard=${c.id}`); }}
                        title={c.listTitle ? `From ${c.listTitle}` : "Open card"}
                      >
                        {c.title}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>, document.body)
      }
    </div>
  );
}
