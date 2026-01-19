"use client";

import { useState, useEffect } from "react";
import Avatar from "./avatar";

type Member = { id: string; name: string | null; email: string; image: string | null };

type ChecklistItem = { title: string; completed: boolean };
  type Checklist = { title: string; items: ChecklistItem[] };
  
  interface ListSettingsModalProps {
    listId: string;
    boardId: string;
    initialDefaults: {
      dueDays?: number | null;
      memberIds?: string[];
      checklists?: Checklist[];
    };
    onClose: () => void;
    onSave: (defaults: { dueDays?: number | null; memberIds?: string[]; checklists?: Checklist[] | null }) => void;
  }
  
  export default function ListSettingsModal({ listId, boardId, initialDefaults, onClose, onSave }: ListSettingsModalProps) {
    const [dueDays, setDueDays] = useState<string>(initialDefaults.dueDays?.toString() ?? "");
    const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set(initialDefaults.memberIds ?? []));
    
    // Checklists state
    const [checklists, setChecklists] = useState<Checklist[]>(initialDefaults.checklists ?? []);
    const [newChecklistTitle, setNewChecklistTitle] = useState("");
    const [isAddingChecklist, setIsAddingChecklist] = useState(false);
  
    // State for adding items to specific checklists
    const [newItemTitles, setNewItemTitles] = useState<Record<number, string>>({});
  
    const [members, setMembers] = useState<Member[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

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
    setSaveStatus("idle");
    const defaults = {
      dueDays: dueDays ? parseInt(dueDays) : null,
      memberIds: Array.from(selectedMembers),
      checklists: checklists.length > 0 ? checklists : null,
    };

    try {
      const res = await fetch(`/api/lists/${listId}/defaults`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(defaults),
      });

      if (res.ok) {
        setSaveStatus("success");
        onSave(defaults);
        // Delay closing slightly so user sees success message
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        const data = await res.json().catch(() => ({}));
        console.error("Failed to save defaults", data);
        setErrorMessage(data.error || "Failed to save changes.");
        setSaveStatus("error");
      }
    } catch (err) {
      console.error("Error saving defaults", err);
      setErrorMessage((err as Error).message || "Error saving defaults.");
      setSaveStatus("error");
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

  function addChecklist() {
    if (!newChecklistTitle.trim()) return;
    setChecklists([...checklists, { title: newChecklistTitle.trim(), items: [] }]);
    setNewChecklistTitle("");
    setIsAddingChecklist(false);
  }

  function removeChecklist(index: number) {
    setChecklists(checklists.filter((_, i) => i !== index));
  }

  function addChecklistItem(checklistIndex: number) {
    const title = newItemTitles[checklistIndex]?.trim();
    if (!title) return;
    
    setChecklists(checklists.map((cl, i) => {
      if (i !== checklistIndex) return cl;
      return { ...cl, items: [...cl.items, { title, completed: false }] };
    }));
    
    setNewItemTitles(prev => ({ ...prev, [checklistIndex]: "" }));
  }

  function removeChecklistItem(checklistIndex: number, itemIndex: number) {
    setChecklists(checklists.map((cl, i) => {
      if (i !== checklistIndex) return cl;
      return { ...cl, items: cl.items.filter((_, idx) => idx !== itemIndex) };
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-background rounded-lg shadow-xl border border-black/10 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-black/10 dark:border-neutral-800">
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
                className="w-20 px-3 py-2 border border-black/10 dark:border-neutral-800 rounded bg-background"
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
                      className={`flex items-center gap-2 p-2 rounded border border-black/10 dark:border-neutral-800 text-left text-sm transition-colors ${
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

          {/* Default Checklists */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">Default Checklists</h3>
              {!isAddingChecklist && (
                <button
                  onClick={() => setIsAddingChecklist(true)}
                  className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded"
                >
                  + Add Checklist
                </button>
              )}
            </div>

            {isAddingChecklist && (
              <div className="mb-4 flex gap-2">
                <input
                  autoFocus
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addChecklist();
                    if (e.key === "Escape") setIsAddingChecklist(false);
                  }}
                  placeholder="Checklist title..."
                  className="flex-1 px-3 py-2 border border-black/10 dark:border-neutral-800 rounded text-sm bg-background"
                />
                <button
                  onClick={addChecklist}
                  disabled={!newChecklistTitle.trim()}
                  className="px-3 py-2 bg-primary text-primary-foreground rounded text-sm disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  onClick={() => setIsAddingChecklist(false)}
                  className="px-3 py-2 bg-foreground/10 hover:bg-foreground/20 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="space-y-4">
              {checklists.map((checklist, clIdx) => (
                <div key={clIdx} className="border border-black/10 dark:border-neutral-800 rounded p-3 bg-foreground/5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium">{checklist.title}</h4>
                    <button
                      onClick={() => removeChecklist(clIdx)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="space-y-2 mb-2 pl-2">
                    {checklist.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="flex items-center gap-2 group">
                        <div className="w-3 h-3 border border-black/10 dark:border-neutral-800 rounded" />
                        <span className="flex-1 text-sm">{item.title}</span>
                        <button
                          onClick={() => removeChecklistItem(clIdx, itemIdx)}
                          className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pl-2">
                    <input
                      value={newItemTitles[clIdx] || ""}
                      onChange={(e) => setNewItemTitles(prev => ({ ...prev, [clIdx]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && addChecklistItem(clIdx)}
                      placeholder="Add item..."
                      className="flex-1 px-2 py-1 border rounded text-xs bg-background"
                    />
                    <button
                      onClick={() => addChecklistItem(clIdx)}
                      disabled={!newItemTitles[clIdx]?.trim()}
                      className="px-2 py-1 bg-foreground/10 hover:bg-foreground/20 rounded text-xs disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
              
              {checklists.length === 0 && !isAddingChecklist && (
                <div className="text-sm text-foreground/50 italic text-center py-2">No checklists configured</div>
              )}
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-black/10 dark:border-neutral-800 bg-foreground/5 flex items-center justify-between">
          <div className="text-sm">
            {saveStatus === "success" && <span className="text-green-600 font-medium">Saved Successfully!</span>}
            {saveStatus === "error" && <span className="text-red-600 font-medium">{errorMessage}</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium hover:bg-foreground/10 rounded">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
