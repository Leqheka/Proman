"use client";

import { useEffect, useRef, useState } from "react";
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const debounced = useDebounced(q, 300);
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function run() {
      const s = debounced.trim();
      if (!s) {
        setResults([]);
        setOpen(false);
        setActiveIndex(0);
        return;
      }
      try {
        const resp = await fetch(`/api/search?q=${encodeURIComponent(s)}`);
        if (!resp.ok) return;
        const data = await resp.json();
        setResults(data ?? []);
        setOpen((data ?? []).length > 0);
        setActiveIndex(0);
      } catch (err) {
        console.error("Search failed", err);
      }
    }
    run();
  }, [debounced]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open && !expanded) return;
      if (e.key === "Escape") {
        setOpen(false);
        setExpanded(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const r = results[activeIndex];
        if (!r) return;
        if (r.type === "card" && r.boardId) {
          router.push(`/boards/${r.boardId}?openCard=${r.id}`);
        } else if (r.type === "board") {
          router.push(`/boards/${r.id}`);
        }
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, expanded, results, activeIndex, router]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      const container = wrapRef.current;
      if (container && !container.contains(target)) {
        setOpen(false);
        setExpanded(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const s = q.trim();
    if (!s) return;
    const first = results[0];
    if (first?.type === "card" && first.boardId) {
      router.push(`/boards/${first.boardId}?openCard=${first.id}`);
    } else if (first?.type === "board" && first.id) {
      router.push(`/boards/${first.id}`);
    }
    setOpen(false);
    setExpanded(false);
  }

  const visible = open && results.length > 0;

  return (
    <div ref={wrapRef} className="relative flex justify-end">
      {!expanded && (
        <button
          type="button"
          onClick={() => {
            setExpanded(true);
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 hover:bg-foreground/10 text-foreground"
          aria-label="Search"
        >
          <span
            className="h-4 w-4 inline-block"
            style={{
              WebkitMaskImage: "url(/icons/search.svg)",
              maskImage: "url(/icons/search.svg)",
              backgroundColor: "currentColor",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskPosition: "center",
              WebkitMaskSize: "contain",
              maskSize: "contain",
            }}
            aria-hidden
          />
        </button>
      )}
      {expanded && (
        <div className="fixed inset-x-0 top-10 z-50 px-2 sm:px-4">
          <div className="mx-auto max-w-7xl">
            <form onSubmit={onSubmit} className="flex items-center gap-2 rounded border border-black/10 bg-background/95 px-3 py-2 shadow dark:border-white/15">
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  if (e.target.value.trim()) {
                    setOpen(true);
                  }
                }}
                placeholder="Search tasks/jobs across boards"
                className="flex-1 bg-transparent text-sm outline-none"
                autoFocus
              />
              <button className="text-xs rounded px-2 py-1 bg-foreground text-background">Search</button>
            </form>
            {visible && (
              <div className="mt-2 max-h-72 w-full overflow-auto rounded border border-black/10 bg-background shadow dark:border-white/15">
                <ul>
                  {results.map((r, i) => (
                    <li
                      key={`${r.type}:${r.id}`}
                      className={`cursor-pointer px-3 py-2 text-sm ${i === activeIndex ? "bg-foreground/10" : "hover:bg-foreground/5"}`}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => {
                        if (r.type === "card" && r.boardId) router.push(`/boards/${r.boardId}?openCard=${r.id}`);
                        else if (r.type === "board") router.push(`/boards/${r.id}`);
                        setOpen(false);
                        setExpanded(false);
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
        </div>
      )}
    </div>
  );
}
