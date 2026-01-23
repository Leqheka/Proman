"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Board {
  id: string;
  title: string;
}

interface BoardCardProps {
  board: Board;
  bgUrl: string;
  isAdmin?: boolean;
}

export default function BoardCard({ board, bgUrl, isAdmin }: BoardCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [newTitle, setNewTitle] = useState(board.title);

  const handleUpdate = async () => {
    const t = newTitle.trim();
    if (!t || t === board.title) {
      setShowEdit(false);
      return;
    }
    
    try {
      const res = await fetch(`/api/boards/${board.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t }),
      });
      if (!res.ok) throw new Error("Failed to update");
      startTransition(() => {
        router.refresh();
      });
      setShowEdit(false);
    } catch (err) {
      console.error(err);
      alert("Failed to update board");
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/boards/${board.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      startTransition(() => {
        router.refresh();
      });
      setShowDelete(false);
    } catch (err) {
      console.error(err);
      alert("Failed to delete board");
    }
  };

  return (
    <>
      <div className="group relative rounded-lg border border-black/10 dark:border-white/15 overflow-hidden">
        <Link href={`/boards/${board.id}`} className="block">
          <div
            className="h-24"
            style={{
              backgroundImage: `url(${bgUrl}), linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)`,
              backgroundSize: "cover, auto",
              backgroundPosition: "center, center",
            }}
          >
            <div className="w-full h-full bg-black/10 hover:bg-black/20 transition-colors p-4 flex items-end">
              <p className="text-sm font-medium text-white drop-shadow">{board.title}</p>
            </div>
          </div>
        </Link>
        
        {/* Action Buttons */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setNewTitle(board.title);
              setShowEdit(true);
            }}
            className="p-1.5 bg-white/90 dark:bg-black/90 rounded text-foreground hover:bg-white dark:hover:bg-black shadow-sm"
            title="Edit board name"
          >
            {/* Edit Icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          {isAdmin && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowDelete(true);
              }}
              className="p-1.5 bg-white/90 dark:bg-black/90 rounded text-red-600 hover:bg-white dark:hover:bg-black shadow-sm"
              title="Delete board"
            >
              {/* Trash Icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowEdit(false)}>
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-sm p-4 border border-black/10 dark:border-white/10" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 text-foreground">Edit Board</h3>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 border border-black/10 dark:border-white/15 rounded mb-4 bg-transparent text-foreground"
              autoFocus
              onKeyDown={(e) => {
                 if (e.key === 'Enter') handleUpdate();
                 if (e.key === 'Escape') setShowEdit(false);
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowEdit(false)}
                className="px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 rounded text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={isPending}
                className="px-3 py-1.5 text-sm bg-foreground text-background rounded hover:opacity-90 font-medium"
              >
                {isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowDelete(false)}>
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-sm p-4 border border-black/10 dark:border-white/10" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2 text-foreground">Delete Board?</h3>
            <p className="text-sm text-foreground/70 mb-4">
              Are you sure you want to delete <strong>{board.title}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDelete(false)}
                className="px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 rounded text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 font-medium"
              >
                {isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
