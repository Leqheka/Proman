"use client";

import React from "react";

type Member = { id: string; name?: string | null; email: string; image?: string | null };

type Attachment = { id: string; url: string; filename: string; size: number; type: string };

type ChecklistItem = { id: string; title: string; completed: boolean };

type Checklist = { id: string; title: string; items: ChecklistItem[] };

type Comment = { id: string; content: string; createdAt: string; author: Member };

type CardDetail = {
  id: string;
  title: string;
  description: string;
  dueDate?: string | null;
  list: { id: string; title: string; boardId: string };
  board: { id: string; title: string };
  labels: Array<{ id: string; name: string; color: string }>;
  attachments: Attachment[];
  comments: Comment[];
  checklists: Checklist[];
  members: Member[];
};

export default function CardModal({ cardId, onClose }: { cardId: string; onClose: () => void }) {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [data, setData] = React.useState<CardDetail | null>(null);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [dueDate, setDueDate] = React.useState<string>("");
  const [commentText, setCommentText] = React.useState("");
  const [newAttachmentUrl, setNewAttachmentUrl] = React.useState("");
  const [editingChecklistId, setEditingChecklistId] = React.useState<string | null>(null);
  const [editingChecklistTitle, setEditingChecklistTitle] = React.useState<string>("");
  const [showChecklistMenu, setShowChecklistMenu] = React.useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = React.useState("Checklist");
  const [copyFromChecklistId, setCopyFromChecklistId] = React.useState<string | "none">("none");
  const [boardChecklists, setBoardChecklists] = React.useState<Array<{ id: string; title: string }>>([]);
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [editingItemTitle, setEditingItemTitle] = React.useState<string>("");
  React.useEffect(() => {
    async function fetchCard() {
      try {
        setLoading(true);
        const resp = await fetch(`/api/cards/${cardId}`);
        const json = await resp.json();
        setData(json);
        setTitle(json.title ?? "");
        setDescription(json.description ?? "");
        setDueDate(json.dueDate ? new Date(json.dueDate).toISOString().slice(0, 16) : "");
      } catch (err) {
        console.error("Failed to load card", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCard();
  }, [cardId]);

  async function saveBasics() {
    try {
      setSaving(true);
      const resp = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, dueDate }),
      });
      if (resp.ok) {
        const updated = await resp.json();
        setData((d) => (d ? { ...d, title: updated.title, description: updated.description ?? "", dueDate: updated.dueDate } : d));
      }
    } catch (err) {
      console.error("Failed to save", err);
    } finally {
      setSaving(false);
    }
  }

  async function addComment() {
    const content = commentText.trim();
    if (!content) return;
    try {
      const resp = await fetch(`/api/cards/${cardId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (resp.ok) {
        const created = await resp.json();
        setData((d) => (d ? { ...d, comments: [created, ...d.comments] } : d));
        setCommentText("");
      }
    } catch (err) {
      console.error("Failed to add comment", err);
    }
  }

  async function fetchBoardChecklists() {
    try {
      const resp = await fetch(`/api/boards/${data?.board.id}/checklists`);
      if (resp.ok) {
        const list: Array<{ id: string; title: string }> = await resp.json();
        setBoardChecklists(list);
      }
    } catch (err) {
      console.error("Failed to fetch board checklists", err);
    }
  }

  function openChecklistMenu() {
    setShowChecklistMenu((s) => {
      const next = !s;
      if (!s) fetchBoardChecklists();
      return next;
    });
  }

  async function addChecklist(title: string, sourceId?: string | null) {
    const t = title.trim();
    if (!t) return;
    try {
      const resp = await fetch(`/api/cards/${cardId}/checklists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, copyFromChecklistId: sourceId || null }),
      });
      if (resp.ok) {
        const created = await resp.json();
        setData((d) => (d ? { ...d, checklists: [...d.checklists, { ...created, items: [] }] } : d));
      }
    } catch (err) {
      console.error("Failed to add checklist", err);
    }
  }

  async function createChecklistFromMenu() {
    await addChecklist(newChecklistTitle, copyFromChecklistId === "none" ? null : copyFromChecklistId);
    setShowChecklistMenu(false);
    setNewChecklistTitle("Checklist");
    setCopyFromChecklistId("none");
  }

  async function updateChecklistTitle(checklistId: string, title: string) {
    const t = title.trim();
    if (!t) return;
    try {
      const resp = await fetch(`/api/checklists/${checklistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t }),
      });
      if (resp.ok) {
        const updated = await resp.json();
        setData((d) => (d ? { ...d, checklists: d.checklists.map((c) => (c.id === checklistId ? { ...c, title: updated.title } : c)) } : d));
      }
    } catch (err) {
      console.error("Failed to update checklist", err);
    }
  }

  async function deleteChecklist(checklistId: string) {
    try {
      const resp = await fetch(`/api/checklists/${checklistId}`, { method: "DELETE" });
      if (resp.ok) {
        setData((d) => (d ? { ...d, checklists: d.checklists.filter((c) => c.id !== checklistId) } : d));
      }
    } catch (err) {
      console.error("Failed to delete checklist", err);
    }
  }

  async function addChecklistItem(checklistId: string, title: string) {
    const t = title.trim();
    if (!t) return;
    try {
      const resp = await fetch(`/api/checklists/${checklistId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t }),
      });
      if (resp.ok) {
        const created = await resp.json();
        setData((d) => {
          if (!d) return d;
          return {
            ...d,
            checklists: d.checklists.map((c) => (c.id === checklistId ? { ...c, items: [...c.items, created] } : c)),
          };
        });
      }
    } catch (err) {
      console.error("Failed to add checklist item", err);
    }
  }

  async function updateChecklistItemTitle(itemId: string, title: string) {
    const t = title.trim();
    if (!t) return setEditingItemId(null);
    try {
      const resp = await fetch(`/api/checklist-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t }),
      });
      if (resp.ok) {
        setData((d) => {
          if (!d) return d;
          return {
            ...d,
            checklists: d.checklists.map((c) => ({
              ...c,
              items: c.items.map((it) => (it.id === itemId ? { ...it, title: t } : it)),
            })),
          };
        });
        setEditingItemId(null);
        setEditingItemTitle("");
      }
    } catch (err) {
      console.error("Failed to update item title", err);
    }
  }

  async function deleteChecklistItem(itemId: string) {
    try {
      const resp = await fetch(`/api/checklist-items/${itemId}`, { method: "DELETE" });
      if (resp.ok) {
        setData((d) => {
          if (!d) return d;
          return {
            ...d,
            checklists: d.checklists.map((c) => ({
              ...c,
              items: c.items.filter((it) => it.id !== itemId),
            })),
          };
        });
      }
    } catch (err) {
      console.error("Failed to delete item", err);
    }
  }

  async function toggleChecklistItem(itemId: string, completed: boolean) {
    try {
      const resp = await fetch(`/api/checklist-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (resp.ok) {
        setData((d) => {
          if (!d) return d;
          return {
            ...d,
            checklists: d.checklists.map((c) => ({
              ...c,
              items: c.items.map((it) => (it.id === itemId ? { ...it, completed } : it)),
            })),
          };
        });
      }
    } catch (err) {
      console.error("Failed to toggle item", err);
    }
  }

  async function addAttachment() {
    const u = newAttachmentUrl.trim();
    if (!u) return;
    try {
      const resp = await fetch(`/api/cards/${cardId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u }),
      });
      if (resp.ok) {
        const created = await resp.json();
        setData((d) => (d ? { ...d, attachments: [...d.attachments, created] } : d));
        setNewAttachmentUrl("");
      }
    } catch (err) {
      console.error("Failed to add attachment", err);
    }
  }

  if (loading || !data) {
    return (
      <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
        <div className="rounded bg-background p-6 shadow w-[800px]">
          <p className="text-sm">Loading card...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-start justify-center p-8 overflow-auto">
        <div className="w-[980px] bg-background rounded shadow-lg border border-black/10 dark:border-white/15">
          <div className="p-4 border-b border-black/10 dark:border-white/15 flex items-center justify-between">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveBasics}
              className="text-lg font-semibold bg-transparent outline-none w-full"
            />
            <button onClick={onClose} className="ml-3 text-xs rounded px-2 py-1 bg-foreground/5">Close</button>
          </div>

          <div className="grid grid-cols-[1fr_320px] gap-6 p-4">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <span className="text-xs">Add:</span>
                <button className="text-xs rounded px-2 py-1 bg-foreground/5">Labels</button>
                <button className="text-xs rounded px-2 py-1 bg-foreground/5">Dates</button>
                <div className="relative">
                  <button onClick={openChecklistMenu} className="text-xs rounded px-2 py-1 bg-foreground/5">Checklist</button>
                  {showChecklistMenu && (
                    <div className="absolute z-20 mt-2 w-64 rounded border border-black/10 dark:border-white/15 bg-background p-3 shadow">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold">Add checklist</p>
                        <button className="text-xs" onClick={() => setShowChecklistMenu(false)}>×</button>
                      </div>
                      <label className="text-xs">Title</label>
                      <input
                        value={newChecklistTitle}
                        onChange={(e) => setNewChecklistTitle(e.target.value)}
                        className="mt-1 w-full text-xs px-2 py-1 border rounded bg-background"
                      />
                      <label className="text-xs mt-3 block">Copy items from...</label>
                      <select
                        value={copyFromChecklistId}
                        onChange={(e) => setCopyFromChecklistId(e.target.value as any)}
                        className="mt-1 w-full text-xs px-2 py-1 border rounded bg-background"
                      >
                        <option value="none">(none)</option>
                        {boardChecklists.map((cl) => (
                          <option key={cl.id} value={cl.id}>{cl.title}</option>
                        ))}
                      </select>
                      <div className="mt-3 flex gap-2">
                        <button onClick={createChecklistFromMenu} className="text-xs rounded px-2 py-1 bg-foreground text-background">Add</button>
                        <button onClick={() => setShowChecklistMenu(false)} className="text-xs rounded px-2 py-1 bg-foreground/5">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
                <button className="text-xs rounded px-2 py-1 bg-foreground/5">Members</button>
                <div className="flex items-center gap-2">
                  <input value={newAttachmentUrl} onChange={(e) => setNewAttachmentUrl(e.target.value)} placeholder="Attachment URL" className="text-xs px-2 py-1 border rounded bg-background" />
                  <button onClick={addAttachment} className="text-xs rounded px-2 py-1 bg-foreground text-background">Add</button>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold">Description</p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={saveBasics}
                  placeholder="Add a more detailed description..."
                  className="mt-2 w-full h-24 text-sm border rounded p-2 bg-background"
                />
              </div>

              {data.attachments.length > 0 && (
                <div>
                  <p className="text-sm font-semibold">Attachments</p>
                  <ul className="mt-2 space-y-2">
                    {data.attachments.map((a) => (
                      <li key={a.id} className="flex items-center justify-between border rounded p-2 bg-foreground/5">
                        <a href={a.url} target="_blank" rel="noreferrer" className="text-sm truncate max-w-[60%]">{a.filename || a.url}</a>
                        <span className="text-xs text-foreground/60">{a.type || "link"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Checklists</p>
                </div>
                {data.checklists.length === 0 ? (
                  <p className="text-xs text-foreground/60 mt-2">No checklists</p>
                ) : (
                  <div className="mt-3 space-y-4">
                    {data.checklists.map((cl) => (
                      <div key={cl.id} className="rounded border border-black/10 dark:border-white/15 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-foreground/80">
                              <path d="M9 11l-2 2-1-1-1.5 1.5L7 15l3.5-3.5L9 11z" />
                              <path d="M4 6h16v2H4V6zm0 10h16v2H4v-2zm0-5h16v2H4v-2z" />
                            </svg>
                            {editingChecklistId === cl.id ? (
                              <input
                                autoFocus
                                value={editingChecklistTitle}
                                onChange={(e) => setEditingChecklistTitle(e.target.value)}
                                onBlur={() => { updateChecklistTitle(cl.id, editingChecklistTitle); setEditingChecklistId(null); }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") { updateChecklistTitle(cl.id, editingChecklistTitle); setEditingChecklistId(null); }
                                  if (e.key === "Escape") { setEditingChecklistId(null); setEditingChecklistTitle(""); }
                                }}
                                className="text-sm font-semibold bg-transparent outline-none border rounded px-1"
                              />
                            ) : (
                              <button
                                onClick={() => { setEditingChecklistId(cl.id); setEditingChecklistTitle(cl.title); }}
                                className="text-sm font-semibold text-left"
                              >
                                {cl.title}
                              </button>
                            )}
                          </div>
                          <button onClick={() => deleteChecklist(cl.id)} className="text-xs rounded px-2 py-1 bg-foreground/5 hover:bg-foreground/10">Delete</button>
                        </div>
                        <ul className="mt-2 space-y-2">
                          {cl.items.map((it) => (
                            <li key={it.id} className="group flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-foreground/5">
                              <div className="flex items-center gap-2">
                                <input type="checkbox" checked={it.completed} onChange={(e) => toggleChecklistItem(it.id, e.target.checked)} />
                                {editingItemId === it.id ? (
                                  <input
                                    autoFocus
                                    value={editingItemTitle}
                                    onChange={(e) => setEditingItemTitle(e.target.value)}
                                    onBlur={() => updateChecklistItemTitle(it.id, editingItemTitle)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") updateChecklistItemTitle(it.id, editingItemTitle);
                                      if (e.key === "Escape") { setEditingItemId(null); setEditingItemTitle(""); }
                                    }}
                                    className="text-sm bg-transparent outline-none border rounded px-1"
                                  />
                                ) : (
                                  <button
                                    onClick={() => { setEditingItemId(it.id); setEditingItemTitle(it.title); }}
                                    className={`text-sm ${it.completed ? "line-through text-foreground/50" : ""}`}
                                  >
                                    {it.title}
                                  </button>
                                )}
                              </div>
                              <button
                                className="opacity-60 group-hover:opacity-100 text-foreground/70 hover:text-foreground"
                                title="Delete item"
                                onClick={() => deleteChecklistItem(it.id)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                  <path d="M9 3h6v2h5v2H4V5h5V3zm2 6h2v9h-2V9z" />
                                </svg>
                              </button>
                            </li>
                          ))}
                          <li className="flex items-center gap-2">
                            <input
                              placeholder="Add an item"
                              className="text-xs px-2 py-1 border rounded bg-background"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const t = (e.currentTarget as HTMLInputElement).value;
                                  (e.currentTarget as HTMLInputElement).value = "";
                                  addChecklistItem(cl.id, t);
                                }
                              }}
                            />
                          </li>
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded border border-black/10 dark:border-white/15 p-3">
                <p className="text-sm font-semibold">Comments and activity</p>
                <div className="mt-2">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="w-full h-20 text-sm border rounded p-2 bg-background"
                  />
                  <div className="mt-2 flex justify-end">
                    <button onClick={addComment} className="text-xs rounded px-2 py-1 bg-foreground text-background">Comment</button>
                  </div>
                </div>
                <ul className="mt-3 space-y-2 max-h-64 overflow-auto">
                  {data.comments.map((c) => (
                    <li key={c.id} className="text-sm">
                      <div className="text-xs text-foreground/60">{c.author?.name || c.author?.email} • {new Date(c.createdAt).toLocaleString()}</div>
                      <div>{c.content}</div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded border border-black/10 dark:border-white/15 p-3">
                <p className="text-sm font-semibold">Due date</p>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  onBlur={saveBasics}
                  className="mt-2 text-sm px-2 py-1 border rounded bg-background w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}