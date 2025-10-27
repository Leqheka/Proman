"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function CreateCard({ listId, onCreated }: { listId: string; onCreated?: (card: { id: string; title: string; order: number }) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;

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
        // Optimistically update parent without waiting for router refresh
        onCreated?.(created);
        // Optional: soft refresh to reconcile server state later without blocking UI
        try { router.refresh(); } catch {}
      } else {
        console.error("Create card failed", await res.text());
      }
    });
  }

  if (!open) {
    return (
      <button
        className="mt-2 w-full rounded border border-dashed border-black/10 dark:border-white/15 p-2 text-left bg-foreground/5 hover:bg-foreground/10"
        onClick={() => setOpen(true)}
      >
        + Add a card
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 flex gap-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Card title"
        className="flex-1 rounded border px-3 py-2"
      />
      <button
        type="submit"
        disabled={isPending || title.trim().length === 0}
        className="rounded bg-black text-white px-3 py-2 disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {isPending ? "Adding…" : "Add"}
      </button>
      <button type="button" className="text-xs" onClick={() => setOpen(false)}>Cancel</button>
    </form>
  );
}