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
  const [newChecklistTitle, setNewChecklistTitle] = React.useState("");
  const [newAttachmentUrl, setNewAttachmentUrl] = React.useState("");

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

  async function addChecklist() {
    const t = newChecklistTitle.trim();
    if (!t) return;
    try {
      const resp = await fetch(`/api/cards/${cardId}/checklists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t }),
      });
      if (resp.ok) {
        const created = await resp.json();
        setData((d) => (d ? { ...d, checklists: [...d.checklists, { ...created, items: [] }] } : d));
        setNewChecklistTitle("");
      }
    } catch (err) {
      console.error("Failed to add checklist", err);
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
                <button onClick={() => document.getElementById(`new-checklist-${data.id}`)?.focus()} className="text-xs rounded px-2 py-1 bg-foreground/5">Checklist</button>
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
                  <div className="flex items-center gap-2">
                    <input id={`new-checklist-${data.id}`} value={newChecklistTitle} onChange={(e) => setNewChecklistTitle(e.target.value)} placeholder="Add checklist" className="text-xs px-2 py-1 border rounded bg-background" />
                    <button onClick={addChecklist} className="text-xs rounded px-2 py-1 bg-foreground text-background">Add</button>
                  </div>
                </div>
                {data.checklists.length === 0 ? (
                  <p className="text-xs text-foreground/60 mt-2">No checklists</p>
                ) : (
                  <div className="mt-3 space-y-4">
                    {data.checklists.map((cl) => (
                      <div key={cl.id} className="rounded border border-black/10 dark:border-white/15 p-3">
                        <p className="text-sm font-medium">{cl.title}</p>
                        <ul className="mt-2 space-y-2">
                          {cl.items.map((it) => (
                            <li key={it.id} className="flex items-center gap-2">
                              <input type="checkbox" checked={it.completed} onChange={(e) => toggleChecklistItem(it.id, e.target.checked)} />
                              <span className={`text-sm ${it.completed ? "line-through text-foreground/50" : ""}`}>{it.title}</span>
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