"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function CreateCard({
  listId,
  onCreated,
  onOptimisticCreate,
  onFinalize,
  onRollback,
}: {
  listId: string;
  onCreated?: (card: any) => void;
  onOptimisticCreate?: (card: { id: string; title: string; order: number }) => void;
  onFinalize?: (prevId: string, created: any) => void;
  onRollback?: (prevId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;

    // If optimistic callbacks are provided, use them for instant insertion
    if (onOptimisticCreate && onFinalize && onRollback) {
      const tempId = `temp-card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const tempCard = { id: tempId, title: t, order: Number.MAX_SAFE_INTEGER };
      onOptimisticCreate(tempCard);
      setTitle("");
      setOpen(false);

      startTransition(async () => {
        try {
          const res = await fetch(`/api/lists/${listId}/cards`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: t }),
          });
          if (res.ok) {
            const created = await res.json();
            onFinalize(tempId, created);
            // Optional compatibility callback
            onCreated?.(created);
            try { router.refresh(); } catch {}
          } else {
            onRollback(tempId);
            console.warn("Create card failed", res.status, res.statusText);
          }
        } catch (err) {
          onRollback(tempId);
          console.error("Create card error", err);
        }
      });
      return;
    }

    // Fallback: previous behavior without optimistic insertion
    startTransition(async () => {
      const res = await fetch(`/api/lists/${listId}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t }),
      });
      if (res.ok) {
        const created = await res.json();
        setTitle("");
        setOpen(false);
        onCreated?.(created);
        try { router.refresh(); } catch {}
      } else {
        console.warn("Create card failed", res.status, res.statusText);
      }
    });
  }

  if (!open) {
    return (
      <button
        className="mt-2 w-full rounded border border-dashed border-black/10 dark:border-white/15 p-2 text-left bg-foreground/15 hover:bg-foreground/20 transition-colors"
        onClick={() => setOpen(true)}
      >
        + Add a card
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 flex flex-col gap-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Card title"
        className="w-full rounded border px-3 py-2"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending || title.trim().length === 0}
          className="rounded bg-black text-white px-3 py-2 disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {isPending ? "Adding…" : "Add"}
        </button>
        <button type="button" className="text-xs rounded px-2 py-1 bg-foreground/5 hover:bg-foreground/10" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}