"use client";

import { useState, useEffect } from "react";
import Avatar from "./avatar";

type Member = { id: string; name: string | null; email: string; image: string | null };

type ChecklistItem = { title: string; completed: boolean };

interface ListSettingsModalProps {
  listId: string;
  boardId: string;
  initialDefaults: {
    dueDays?: number | null;
    memberIds?: string[];
    checklist?: ChecklistItem[];
  };
  onClose: () => void;
  onSave: (defaults: { dueDays?: number | null; memberIds?: string[]; checklist?: ChecklistItem[] | null }) => void;
}

export default function ListSettingsModal({ listId, boardId, initialDefaults, onClose, onSave }: ListSettingsModalProps) {
  const [dueDays, setDueDays] = useState<string>(initialDefaults.dueDays?.toString() ?? "");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set(initialDefaults.memberIds ?? []));
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(initialDefaults.checklist ?? []);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingMembers(true);
    fetch(`/api/boards/${boardId}/members`)
      .then((res) => res.json())
      .then((data) => {
        if (active && Array.isArray(data)) {
          setMembers(data);
        }
      })
      .catch((err) => console.error("Failed to load members", err))
      .finally(() => {
        if (active) setLoadingMembers(false);
      });
    return () => { active = false; };
  }, [boardId]);

  async function handleSave() {
    setSaving(true);
    const defaults = {
      dueDays: dueDays ? parseInt(dueDays) : null,
      memberIds: Array.from(selectedMembers),
      checklist: checklistItems.length > 0 ? checklistItems : null,
    };

    try {
      const res = await fetch(`/api/lists/${listId}/defaults`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(defaults),
      });

      if (res.ok) {
        onSave(defaults);
        onClose();
      } else {
        console.error("Failed to save defaults");
      }
    } catch (err) {
      console.error("Error saving defaults", err);
    } finally {
      setSaving(false);
    }
  }

  function toggleMember(id: string) {
    const next = new Set(selectedMembers);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedMembers(next);
  }

  function addChecklistItem() {
    if (!newItemTitle.trim()) return;
    setChecklistItems([...checklistItems, { title: newItemTitle.trim(), completed: false }]);
    setNewItemTitle("");
  }

  function removeChecklistItem(index: number) {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-background rounded-lg shadow-xl border overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">List Defaults</h2>
          <button onClick={onClose} className="text-foreground/50 hover:text-foreground">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-6">
          {/* Default Due Date */}
          <section>
            <h3 className="text-sm font-medium mb-2">Default Due Date</h3>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={dueDays}
                onChange={(e) => setDueDays(e.target.value)}
                placeholder="0"
                className="w-20 px-3 py-2 border rounded bg-background"
              />
              <span className="text-sm text-foreground/70">days after creation</span>
            </div>
            <p className="text-xs text-foreground/50 mt-1">Leave empty to disable default due date.</p>
          </section>

          {/* Default Members */}
          <section>
            <h3 className="text-sm font-medium mb-2">Default Members</h3>
            {loadingMembers ? (
              <div className="text-sm text-foreground/50">Loading members...</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {members.map((m) => {
                  const selected = selectedMembers.has(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleMember(m.id)}
                      className={`flex items-center gap-2 p-2 rounded border text-left text-sm transition-colors ${
                        selected ? "bg-primary/10 border-primary" : "hover:bg-foreground/5 border-transparent"
                      }`}
                    >
                      <Avatar name={m.name || m.email} email={m.email} image={m.image} size={24} />
                      <span className="truncate flex-1">{m.name || m.email}</span>
                      {selected && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Default Checklist */}
          <section>
            <h3 className="text-sm font-medium mb-2">Default Checklist</h3>
            <div className="space-y-2 mb-3">
              {checklistItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 group">
                  <div className="w-4 h-4 border rounded" />
                  <span className="flex-1 text-sm">{item.title}</span>
                  <button
                    onClick={() => removeChecklistItem(idx)}
                    className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {checklistItems.length === 0 && (
                <div className="text-sm text-foreground/50 italic">No items yet</div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addChecklistItem()}
                placeholder="New item..."
                className="flex-1 px-3 py-2 border rounded text-sm bg-background"
              />
              <button
                onClick={addChecklistItem}
                disabled={!newItemTitle.trim()}
                className="px-3 py-2 bg-foreground/10 hover:bg-foreground/20 rounded text-sm disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </section>
        </div>

        <div className="p-4 border-t bg-foreground/5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium hover:bg-foreground/10 rounded">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground bg-black text-white dark:bg-white dark:text-black rounded hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Defaults"}
          </button>
        </div>
      </div>
    </div>
  );
}
