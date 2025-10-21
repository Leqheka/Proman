"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  type: "card" | "board";
  id: string;
  title: string;
  boardId?: string;
  boardTitle?: string;
  listId?: string;
  listTitle?: string;
}

function useDebounced<T>(value: T, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function GlobalSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(q, 300);
  const router = useRouter();

  useEffect(() => {
    async function run() {
      const s = debounced.trim();
      if (!s) {
        setResults([]);
        return;
      }
      try {
        const resp = await fetch(`/api/search?q=${encodeURIComponent(s)}`);
        if (!resp.ok) return;
        const data = await resp.json();
        setResults(data ?? []);
        setOpen(true);
      } catch (err) {
        console.error("Search failed", err);
      }
    }
    run();
  }, [debounced]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const s = q.trim();
    if (!s) return;
    // For now, navigate to the first card result's board
    const first = results[0];
    if (first?.type === "card" && first.boardId) {
      router.push(`/boards/${first.boardId}`);
    } else if (first?.type === "board" && first.id) {
      router.push(`/boards/${first.id}`);
    }
  }

  const visible = open && results.length > 0;

  return (
    <div className="relative w-full max-w-xl">
      <form onSubmit={onSubmit} className="flex items-center gap-2 rounded bg-foreground/5 px-3 py-1">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tasks/jobs across boards"
          className="flex-1 bg-transparent outline-none text-sm"
        />
        <button className="text-xs rounded px-2 py-1 bg-foreground text-background">Search</button>
      </form>
      {visible && (
        <div className="absolute z-50 mt-2 w-full rounded border border-black/10 dark:border-white/15 bg-background shadow">
          <ul className="max-h-72 overflow-auto">
            {results.map((r) => (
              <li
                key={`${r.type}:${r.id}`}
                className="px-3 py-2 text-sm hover:bg-foreground/5 cursor-pointer"
                onClick={() => {
                  if (r.type === "card" && r.boardId) router.push(`/boards/${r.boardId}`);
                  else if (r.type === "board") router.push(`/boards/${r.id}`);
                  setOpen(false);
                }}
              >
                {r.type === "card" ? (
                  <span>
                    {r.title} <span className="text-foreground/60">— {r.boardTitle} / {r.listTitle}</span>
                  </span>
                ) : (
                  <span>Board: {r.title}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}