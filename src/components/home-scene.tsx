"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

const HOME_BACKGROUNDS = [
  "/Backgrounds/Default.jpg",
  "/Backgrounds/aj-FjDaN9WlRLg-unsplash.jpg",
  "/Backgrounds/aritra-roy-mEjphVjP3hA-unsplash.jpg",
  "/Backgrounds/barb-canale-YDG0lDHz9PI-unsplash.jpg",
  "/Backgrounds/clement-fusil-Fpqx6GGXfXs-unsplash.jpg",
  "/Backgrounds/elizeu-dias-RN6ts8IZ4_0-unsplash.jpg",
  "/Backgrounds/gayatri-malhotra-P9gkfbaxMTU-unsplash.jpg",
  "/Backgrounds/lukas-blazek-GnvurwJsKaY-unsplash.jpg",
  "/Backgrounds/maxxup-B2I9jm2bDlE-unsplash.jpg",
  "/Backgrounds/sean-oulashin-KMn4VEePR8-unsplash.jpg",
  "/Backgrounds/social-mode-WmVtCFR1C1g-unsplash.jpg",
  "/Backgrounds/tianyi-ma-j1Fv6s4jwXI-unsplash.jpg",
];

const DEFAULT_HOME_BG = HOME_BACKGROUNDS[0];

export default function HomeScene({ children, isAdmin }: { children: React.ReactNode; isAdmin?: boolean }) {
  const router = useRouter();
  const [bg, setBg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const bgMenuRef = useRef<HTMLDivElement>(null);

  // Settings state
  const [openSettings, setOpenSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Archives state
  const [openArchives, setOpenArchives] = useState(false);
  const [archivedBoards, setArchivedBoards] = useState<any[]>([]);

  useEffect(() => {
    try {
      const v = localStorage.getItem("homeBg");
      if (v) setBg(v);
    } catch {}
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (open && bgMenuRef.current && !bgMenuRef.current.contains(target)) {
        setOpen(false);
      }
      if (openSettings && settingsRef.current && !settingsRef.current.contains(target)) {
        setOpenSettings(false);
      }
    };
    if (open || openSettings) {
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }
  }, [open, openSettings]);

  // Load archives
  useEffect(() => {
    if (openArchives && isAdmin) {
      fetch("/api/boards")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setArchivedBoards(data.filter((b: any) => b.isArchived));
          }
        })
        .catch(console.error);
    }
  }, [openArchives, isAdmin]);

  function changeBackground(url: string) {
    try {
      localStorage.setItem("homeBg", url);
      setBg(url);
      setOpen(false);
    } catch {}
  }

  async function restoreBoard(id: string) {
    try {
        await fetch(`/api/boards/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isArchived: false })
        });
        setArchivedBoards(prev => prev.filter(b => b.id !== id));
        router.refresh();
    } catch (e) {
        console.error(e);
    }
  }

  // Use a relative proxy path to keep SSR and client styles identical
  const toProxy = (u: string) => (u && u.startsWith("http") ? `/api/image-proxy?url=${encodeURIComponent(u)}` : u);

  const appliedBg = bg ?? DEFAULT_HOME_BG;
  const style: React.CSSProperties = {
    backgroundImage: `url(${toProxy(appliedBg)}), linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)`,
    backgroundSize: "cover, auto",
    backgroundPosition: "center, center",
    backgroundRepeat: "no-repeat, no-repeat",
  };

  return (
    <div className="min-h-screen text-foreground" style={style}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="mt-2 mb-2 flex items-center justify-end gap-2">
          <div className="relative" ref={bgMenuRef}>
            <button onClick={() => setOpen((v) => !v)} className="text-xs rounded px-2 py-1 bg-foreground/5 hover:bg-foreground/10">Change background</button>
            {open && (
              <div className="absolute right-0 mt-2 w-64 rounded border border-black/10 dark:border-white/15 bg-background p-2 shadow z-50">
                <div className="grid grid-cols-2 gap-2">
                  {HOME_BACKGROUNDS.map((u) => (
                    <button
                      key={u}
                      className="h-20 rounded overflow-hidden border border-black/10 dark:border-white/15"
                      onClick={() => changeBackground(u)}
                      style={{ backgroundImage: `url(${toProxy(u)}), linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)`, backgroundSize: "cover, auto", backgroundPosition: "center, center", backgroundRepeat: "no-repeat, no-repeat" }}
                      aria-label="Pick background"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          {isAdmin && (
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setOpenSettings((v) => !v)}
                className="flex items-center justify-center text-xs rounded px-2 py-1 bg-foreground/5 hover:bg-foreground/10"
                title="Settings"
              >
                <span className="text-lg leading-none">⚙</span>
              </button>
              {openSettings && (
                <div className="absolute right-0 mt-2 w-48 rounded border border-black/10 dark:border-white/15 bg-background p-2 shadow z-50 flex flex-col gap-1">
                  <Link
                    href="/members"
                    className="block w-full text-left text-xs rounded px-2 py-1 hover:bg-foreground/5 text-foreground"
                    onClick={() => setOpenSettings(false)}
                  >
                    Manage Members
                  </Link>
                  <button
                    onClick={() => { setOpenSettings(false); setOpenArchives(true); }}
                    className="block w-full text-left text-xs rounded px-2 py-1 hover:bg-foreground/5 text-foreground"
                  >
                    Board Archives
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {children}
      {openArchives && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setOpenArchives(false); }}>
            <div className="w-full max-w-lg rounded border border-black/10 dark:border-white/15 bg-background p-4 shadow">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Archived Boards</h3>
                    <button className="text-xs px-2 py-1 rounded hover:bg-foreground/10" onClick={() => setOpenArchives(false)}>Close</button>
                </div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {archivedBoards.length === 0 ? <p className="text-sm text-foreground/60">No archived boards.</p> : 
                        archivedBoards.map(b => (
                            <div key={b.id} className="flex items-center justify-between p-2 border border-black/10 dark:border-white/15 rounded bg-foreground/5">
                                <span className="text-sm">{b.title}</span>
                                <button onClick={() => restoreBoard(b.id)} className="text-xs bg-foreground text-background px-2 py-1 rounded hover:opacity-90">Restore</button>
                            </div>
                        ))
                    }
                </div>
            </div>
        </div>,
        document.body
      )}
    </div>
  );
}
