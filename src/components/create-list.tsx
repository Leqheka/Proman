"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function CreateList({ boardId, onCreated }: { boardId: string; onCreated?: (list: { id: string; title: string; order: number }) => void }) {
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;

    startTransition(async () => {
      const res = await fetch(`/api/boards/${boardId}/lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t }),
      });
      if (res.ok) {
        const created = await res.json();
        setTitle("");
        // Optimistically inform parent with the created list
        onCreated?.(created);
        // Optional background refresh; does not block UI
        try { router.refresh(); } catch {}
      } else {
        console.error("Create list failed", await res.text());
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New list title"
        className="flex-1 rounded border px-3 py-2"
      />
      <button
        type="submit"
        disabled={isPending || title.trim().length === 0}
        className="rounded bg-black text-white px-3 py-2 disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {isPending ? "Adding…" : "Add List"}
      </button>
    </form>
  );
}