"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function CreateBoard() {
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleCreate() {
    const t = title.trim();
    if (!t) return;
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t }),
      });
      if (!res.ok) throw new Error("Failed to create");
      setTitle("");
      startTransition(() => router.refresh());
    } catch (err) {
      console.error(err);
      alert("Failed to create board. Configure DATABASE_URL to enable DB.");
    }
  }

  return (
    <div className="mt-4 flex gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="border border-black/10 dark:border-white/15 rounded px-3 py-2 text-sm bg-background text-foreground"
        placeholder="Board title"
      />
      <button
        onClick={handleCreate}
        disabled={isPending || !title.trim()}
        className="rounded bg-foreground text-background px-3 py-2 text-sm disabled:opacity-50"
      >
        Create
      </button>
    </div>
  );
}