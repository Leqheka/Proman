"use client";

import React from "react";
import ChecklistItems from "./checklist-items";

interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  order?: number;
  dueDate?: string | null;
}

interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
}

interface ChecklistRendererProps {
  checklist: Checklist;
  defaultOpen: boolean;
  onUpdateTitle: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onUpdateItem: (itemId: string, data: Partial<ChecklistItem>) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (checklistId: string, title: string) => void;
  onReorderItems: (checklistId: string, newItems: ChecklistItem[]) => void;
}

export default function ChecklistRenderer({
  checklist: cl,
  defaultOpen,
  onUpdateTitle,
  onDelete,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onReorderItems,
}: ChecklistRendererProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const [editingTitle, setEditingTitle] = React.useState<string | null>(null);

  // Sync open state with defaultOpen prop to handle auto-collapse/expand behavior
  // (e.g. when a new checklist is added, the previous "latest" one should collapse if it was default-opened)
  React.useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <div className="rounded border border-black/10 dark:border-neutral-800 p-3 bg-background">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="hover:bg-foreground/5 rounded p-0.5 transition-colors text-foreground/60 hover:text-foreground"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className={`transform transition-transform duration-200 ${isOpen ? "rotate-0" : "-rotate-90"}`}
            >
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span
              className="w-[15px] h-[15px] opacity-80 inline-block flex-shrink-0"
              style={{
                WebkitMaskImage: 'url(/icons/New/checklists.svg)',
                maskImage: 'url(/icons/New/checklists.svg)',
                backgroundColor: 'currentColor',
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskPosition: 'center',
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
              }}
              aria-hidden
            />
            {editingTitle !== null ? (
              <input
                autoFocus
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={() => {
                  if (editingTitle.trim() !== cl.title) {
                      onUpdateTitle(cl.id, editingTitle);
                  }
                  setEditingTitle(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                      if (editingTitle.trim() !== cl.title) {
                          onUpdateTitle(cl.id, editingTitle);
                      }
                      setEditingTitle(null);
                  }
                  if (e.key === "Escape") {
                      setEditingTitle(null);
                  }
                }}
                className="text-sm font-semibold bg-transparent outline-none border rounded px-1 w-full"
              />
            ) : (
              <button
                onClick={() => setEditingTitle(cl.title)}
                className="text-sm font-semibold text-left truncate hover:bg-foreground/5 rounded px-1 -ml-1 transition-colors"
              >
                {cl.title}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {!isOpen && (
             <div className="text-xs text-foreground/60 flex items-center gap-1">
                 <span>{cl.items.filter(i => i.completed).length}/{cl.items.length}</span>
             </div>
          )}
          <button
            onClick={() => onDelete(cl.id)}
            className="text-xs rounded px-2 py-1 bg-foreground/5 hover:bg-foreground/10 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="mt-3">
          <ChecklistItems
            checklist={cl}
            onUpdateItem={onUpdateItem}
            onDeleteItem={onDeleteItem}
            onAddItem={onAddItem}
            onReorderItems={onReorderItems}
          />
        </div>
      )}
    </div>
  );
}
