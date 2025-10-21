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
  archived?: boolean;
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
  const [loadingComments, setLoadingComments] = React.useState(false);
  const [loadingChecklists, setLoadingChecklists] = React.useState(false);
  const [newAttachmentUrl, setNewAttachmentUrl] = React.useState("");
  const [editingChecklistId, setEditingChecklistId] = React.useState<string | null>(null);
  const [editingChecklistTitle, setEditingChecklistTitle] = React.useState<string>("");
  const [showChecklistMenu, setShowChecklistMenu] = React.useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = React.useState("Checklist");
  const [copyFromChecklistId, setCopyFromChecklistId] = React.useState<string | "none">("none");
  const [boardChecklists, setBoardChecklists] = React.useState<Array<{ id: string; title: string }>>([]);
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [editingItemTitle, setEditingItemTitle] = React.useState<string>("");

  // Dates popover state
  const [showDatesMenu, setShowDatesMenu] = React.useState(false);
  const [calendarCursor, setCalendarCursor] = React.useState<Date>(new Date());
  const [useStart, setUseStart] = React.useState(false);
  const [useDue, setUseDue] = React.useState(true);
  const [tempStartDate, setTempStartDate] = React.useState<string>("");
  const [tempDueDate, setTempDueDate] = React.useState<string>("");
  const [recurring, setRecurring] = React.useState<string>("Never");
  const [reminder, setReminder] = React.useState<string>("1 Day before");

  React.useEffect(() => {
    const controller = new AbortController();
    async function fetchCard() {
      try {
        setLoading(true);
        const resp = await fetch(`/api/cards/${cardId}?summary=1`, { signal: controller.signal });
        const summary = await resp.json();
        setData(summary);
        setTitle(summary.title ?? "");
        setDescription(summary.description ?? "");
        setDueDate(summary.dueDate ? new Date(summary.dueDate).toISOString().slice(0, 16) : "");
        setLoading(false);
        setLoadingComments(true);
        setLoadingChecklists(true);
        // Fetch heavy sections in parallel without blocking initial render
        const [commentsRes, attachmentsRes, checklistsRes] = await Promise.allSettled([
          fetch(`/api/cards/${cardId}/comments?take=50`, { signal: controller.signal }),
          fetch(`/api/cards/${cardId}/attachments`, { signal: controller.signal }),
          fetch(`/api/cards/${cardId}/checklists`, { signal: controller.signal }),
        ]);
        const comments =
          commentsRes.status === "fulfilled" && commentsRes.value.ok ? await commentsRes.value.json() : [];
        const attachments =
          attachmentsRes.status === "fulfilled" && attachmentsRes.value.ok ? await attachmentsRes.value.json() : [];
        const checklists =
          checklistsRes.status === "fulfilled" && checklistsRes.value.ok ? await checklistsRes.value.json() : [];
        setData((d) => (d ? { ...d, comments, attachments, checklists } : d));
        setLoadingComments(false);
        setLoadingChecklists(false);
      } catch (err) {
        if ((err as any)?.name !== "AbortError") {
          console.error("Failed to load card", err);
          setLoadingComments(false);
          setLoadingChecklists(false);
        }
      }
    }
    fetchCard();
    return () => controller.abort();
  }, [cardId]);

  // Keep tempDueDate synced with controlled dueDate input
  React.useEffect(() => {
    setTempDueDate(dueDate || "");
  }, [dueDate]);

  function openDatesMenu() {
    setShowDatesMenu((s) => !s);
  }

  function getMonthCells(d: Date) {
    const year = d.getFullYear(), month = d.getMonth();
    const first = new Date(year, month, 1);
    const startWeekday = first.getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

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

  async function updateDueDate(next: string | null) {
    try {
      const resp = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: next }),
      });
      if (resp.ok) {
        const updated = await resp.json();
        setData((d) => (d ? { ...d, dueDate: updated.dueDate } : d));
        setDueDate(updated.dueDate ? new Date(updated.dueDate).toISOString().slice(0, 16) : "");
      }
    } catch (err) {
      console.error("Failed to update due date", err);
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

  async function toggleCardArchived(next: boolean) {
    try {
      const resp = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: next }),
      });
      if (resp.ok) {
        setData((d) => (d ? { ...d, archived: next } : d));
      }
    } catch (err) {
      console.error("Failed to toggle archived", err);
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
        setData((d) => (d ? { ...d, checklists: [...d.checklists, created] } : d));
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
            <div className="flex items-center gap-2 w-full">
              <input type="checkbox" checked={!!data.archived} onChange={(e) => toggleCardArchived(e.target.checked)} />
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveBasics}
                className="text-lg font-semibold bg-transparent outline-none w-full"
              />
            </div>
            <button onClick={onClose} className="ml-3 text-xs rounded px-2 py-1 bg-foreground/5">Close</button>
          </div>

          <div className="grid grid-cols-[1fr_320px] gap-6 p-4">
            {/* Left column */}
            <div className="space-y-6">
              {/* Top Add toolbar with Dates popover */}
              <div className="flex items-center gap-2">
                <span className="text-xs">Add:</span>
                <button className="text-xs rounded px-2 py-1 bg-foreground/5 hover:bg-foreground/10 transition-colors">Labels</button>
                <div className="relative">
                  <button onClick={openDatesMenu} className="text-xs rounded px-2 py-1 bg-foreground/5 hover:bg-foreground/10 transition-colors">Dates</button>
                  {showDatesMenu && (
                    <div className="absolute z-20 mt-2 w-[280px] rounded border border-black/10 dark:border-white/15 bg-background p-3 shadow">
                      <div className="flex items-center justify-between mb-2">
                        <button className="text-xs" onClick={() => setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1))}>‹</button>
                        <p className="text-sm font-semibold">{calendarCursor.toLocaleString(undefined, { month: "long", year: "numeric" })}</p>
                        <button className="text-xs" onClick={() => setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1))}>›</button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center text-xs">
                        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (<div key={d} className="text-foreground/60">{d}</div>))}
                        {getMonthCells(calendarCursor).map((c, idx) => (
                          <button
                            key={idx}
                            className={`h-8 rounded ${c ? "hover:bg-foreground/10" : ""}`}
                            onClick={() => {
                              if (!c) return;
                              const pad = (n: number) => String(n).padStart(2, "0");
                              const dateStr = `${c.getFullYear()}-${pad(c.getMonth() + 1)}-${pad(c.getDate())}`;
                              if (useStart) setTempStartDate(dateStr);
                              if (useDue) setTempDueDate((prev) => {
                                const time = prev?.split("T")[1] || "18:00";
                                return `${dateStr}T${time}`;
                              });
                            }}
                          >
                            {c ? c.getDate() : ""}
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 space-y-2">
                        <label className="flex items-center gap-2 text-xs">
                          <input type="checkbox" checked={useStart} onChange={(e) => setUseStart(e.target.checked)} />
                          <span>Start date</span>
                          <input
                            type="date"
                            value={tempStartDate}
                            onChange={(e) => setTempStartDate(e.target.value)}
                            disabled={!useStart}
                            className="ml-auto border rounded px-1 py-[2px] bg-background"
                          />
                        </label>
                        <label className="grid grid-cols-[auto_1fr] items-center gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={useDue} onChange={(e) => setUseDue(e.target.checked)} />
                            <span>Due date</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={tempDueDate ? tempDueDate.split("T")[0] : ""}
                              onChange={(e) => {
                                const time = tempDueDate.split("T")[1] || "18:00";
                                setTempDueDate(`${e.target.value}T${time}`);
                              }}
                              disabled={!useDue}
                              className="border rounded px-1 py-[2px] bg-background"
                            />
                            <input
                              type="time"
                              value={tempDueDate ? tempDueDate.split("T")[1] || "" : ""}
                              onChange={(e) => {
                                const date = tempDueDate.split("T")[0] || new Date().toISOString().slice(0, 10);
                                setTempDueDate(`${date}T${e.target.value}`);
                              }}
                              disabled={!useDue}
                              className="border rounded px-1 py-[2px] bg-background w-24"
                            />
                          </div>
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                          <label className="text-xs">Recurring</label>
                          <select value={recurring} onChange={(e) => setRecurring(e.target.value)} className="text-xs px-2 py-1 border rounded bg-background">
                            <option>Never</option>
                            <option>Daily</option>
                            <option>Weekly</option>
                            <option>Monthly</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          <label className="text-xs">Set due date reminder</label>
                          <select value={reminder} onChange={(e) => setReminder(e.target.value)} className="text-xs px-2 py-1 border rounded bg-background">
                            <option>At time of event</option>
                            <option>5 minutes before</option>
                            <option>10 minutes before</option>
                            <option>1 hour before</option>
                            <option>1 Day before</option>
                          </select>
                        </div>
                        <p className="text-[11px] text-foreground/60">Reminders will be sent to all members and watchers of this card.</p>
                        <div className="mt-2 flex gap-2">
                          <button
                            className="text-xs rounded px-2 py-1 bg-foreground text-background hover:opacity-90 transition-opacity"
                            onClick={async () => { await updateDueDate(useDue ? tempDueDate || null : null); setShowDatesMenu(false); }}
                          >
                            Save
                          </button>
                          <button
                            className="text-xs rounded px-2 py-1 bg-foreground/5 hover:bg-foreground/10 transition-colors"
                            onClick={async () => { await updateDueDate(null); setTempDueDate(""); setUseDue(true); setShowDatesMenu(false); }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button onClick={openChecklistMenu} className="text-xs rounded px-2 py-1 bg-foreground/5 hover:bg-foreground/10 transition-colors">Checklist</button>
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
                        <button onClick={createChecklistFromMenu} className="text-xs rounded px-2 py-1 bg-foreground text-background hover:opacity-90 transition-opacity">Add</button>
                        <button onClick={() => setShowChecklistMenu(false)} className="text-xs rounded px-2 py-1 bg-foreground/5 hover:bg-foreground/10 transition-colors">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
                <button className="text-xs rounded px-2 py-1 bg-foreground/5 hover:bg-foreground/10 transition-colors">Members</button>
                <div className="flex items-center gap-2">
                  <input value={newAttachmentUrl} onChange={(e) => setNewAttachmentUrl(e.target.value)} placeholder="Attachment URL" className="text-xs px-2 py-1 border rounded bg-background" />
                  <button onClick={addAttachment} className="text-xs rounded px-2 py-1 bg-foreground text-background hover:opacity-90 transition-opacity">Add</button>
                </div>
              </div>

              {/* Selected dates chips displayed above Description */}
              {(data.dueDate || tempStartDate) && (
                <div className="rounded border border-black/10 dark:border-white/15 p-2">
                  <div className="flex items-center gap-3 text-xs">
                    {tempStartDate && (
                      <span className="px-2 py-1 rounded bg-background border">Start {new Date(tempStartDate).toLocaleDateString()}</span>
                    )}
                    {data.dueDate && (
                      <span className="px-2 py-1 rounded bg-background border">Due {new Date(data.dueDate).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
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

              {/* Attachments */}
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

              {/* Checklists */}
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
                            <span
                              className="w-4 h-4 opacity-80 inline-block"
                              style={{
                                WebkitMaskImage: 'url(/icons/check-mark-box.svg)',
                                maskImage: 'url(/icons/check-mark-box.svg)',
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
                                <span
                                  className="w-4 h-4 inline-block"
                                  style={{
                                    WebkitMaskImage: 'url(/icons/trash.svg)',
                                    maskImage: 'url(/icons/trash.svg)',
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
                              </button>
                            </li>
                          ))}
                          <li className="flex items-center gap-2">
                            <input
                              placeholder="Add an item"
                              className="flex-1 w-full text-xs px-2 py-1 border rounded bg-background"
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

            {/* Right column */}
            <div className="space-y-4">
              <div className="rounded border border-black/10 dark:border-white/15 p-3 bg-foreground/5">
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
                {loadingComments ? (
                  <div className="mt-3 space-y-2 animate-pulse">
                    <div className="h-3 rounded bg-foreground/10 w-3/5" />
                    <div className="h-3 rounded bg-foreground/10 w-2/5" />
                    <div className="h-3 rounded bg-foreground/10 w-4/5" />
                  </div>
                ) : data.comments.length === 0 ? (
                  <p className="mt-3 text-xs text-foreground/60">No comments yet</p>
                ) : (
                  <ul className="mt-3 space-y-2 max-h-64 overflow-auto">
                    {data.comments.map((c) => (
                      <li key={c.id} className="text-sm">
                        <div className="text-xs text-foreground/60">{c.author?.name || c.author?.email} • {new Date(c.createdAt).toLocaleString()}</div>
                        <div>{c.content}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}