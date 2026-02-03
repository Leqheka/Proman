"use client";

import { useState } from "react";
import CreateList from "./create-list";

export default function AddListTile({
  boardId,
  onOptimisticCreate,
  onFinalize,
  onRollback,
}: {
  boardId: string;
  onOptimisticCreate?: (list: { id: string; title: string; order: number }) => void;
  onFinalize?: (prevId: string, created: { id: string; title: string; order: number }) => void;
  onRollback?: (prevId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        className="w-72 shrink-0 rounded-lg border border-dashed border-black/10 dark:border-white/20 p-3 text-left bg-background/60 text-foreground hover:bg-background/80 transition-colors"
        onClick={() => setOpen(true)}
      >
        + Add another list
      </button>
    );
  }
  return (
    <div className="w-72 shrink-0 rounded-lg border border-black/10 dark:border-white/20 p-3 bg-background/90 text-foreground">
      <div className="mb-2 text-sm">Add list</div>
      <CreateList
        boardId={boardId}
        onOptimisticCreate={(list) => {
          onOptimisticCreate?.(list);
          setOpen(false);
        }}
        onFinalize={(prevId, created) => onFinalize?.(prevId, created)}
        onRollback={(prevId) => onRollback?.(prevId)}
      />
      <button className="mt-2 text-xs" onClick={() => setOpen(false)}>Cancel</button>
    </div>
  );
}
