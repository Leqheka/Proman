"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type BoardRef = { id: string; title: string };

const STOCKS = [
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1600&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1600&auto=format&fit=crop&q=60",
];

export default function BoardToolbar({
  boards,
  currentBoardId,
  boardTitle,
}: {
  boards: BoardRef[];
  currentBoardId: string;
  boardTitle: string;
}) {
  const router = useRouter();
  const [openBg, setOpenBg] = useState(false);

  async function changeBackground(url: string) {
    try {
      await fetch(`/api/boards/${currentBoardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ background: url }),
      });
      router.refresh();
    } catch (err) {
      console.error("Failed to change background", err);
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
          <div className="relative">
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
                      style={{ backgroundImage: `url(${u})`, backgroundSize: "cover", backgroundPosition: "center" }}
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