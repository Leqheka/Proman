"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

type BoardRef = { id: string; title: string };

const STOCKS = [
  "https://picsum.photos/id/1018/1600/900",
  "https://picsum.photos/id/1024/1600/900",
  "https://picsum.photos/id/1035/1600/900",
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
          <span className="font-medium text-sm truncate max-w-[22ch]">{boardTitle}</span>
          <select
            value={currentBoardId}
            onChange={(e) => router.push(`/boards/${e.target.value}`)}
            className="text-xs rounded bg-foreground/5 px-2 py-1"
            title="Switch board"
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id}>{b.title}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative" ref={bgMenuWrapRef}>
            <button onClick={() => setOpenBg((v) => !v)} className="text-xs rounded px-2 py-1 bg-foreground/5">Change background</button>
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
          <button className="text-xs rounded px-2 py-1 bg-foreground/5" title="Board settings">Board settings</button>
        </div>
      </div>
    </div>
  );
}