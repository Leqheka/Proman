"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function CreateCard({ listId }: { listId: string }) {
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
        setTitle("");
        setOpen(false);
        router.refresh();
      } else {
        console.error("Create card failed", await res.text());
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 text-xs text-foreground/70 hover:text-foreground"
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
        className="rounded bg-black text-white px-3 py-2 text-xs disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {isPending ? "Adding…" : "Add"}
      </button>
      <button
        type="button"
        onClick={() => { setOpen(false); setTitle(""); }}
        className="rounded border px-3 py-2 text-xs"
      >
        Cancel
      </button>
    </form>
  );
}