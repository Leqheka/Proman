"use client";

import { useState } from "react";
import CreateList from "./create-list";

export default function AddListTile({ boardId, onCreated }: { boardId: string; onCreated?: (list: { id: string; title: string; order: number }) => void }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        className="w-72 shrink-0 rounded-lg border border-dashed border-black/10 dark:border-white/15 p-3 text-left bg-gray-100 hover:bg-gray-200"
        onClick={() => setOpen(true)}
      >
        + Add another list
      </button>
    );
  }
  return (
    <div className="w-72 shrink-0 rounded-lg border border-black/10 dark:border-white/15 p-3 bg-gray-100">
      <div className="mb-2 text-sm">Add list</div>
      <CreateList
        boardId={boardId}
        onCreated={(list) => {
          setOpen(false);
          onCreated?.(list);
        }}
      />
      <button className="mt-2 text-xs" onClick={() => setOpen(false)}>Cancel</button>
    </div>
  );
}