"use client";

import React from "react";
import Avatar from "./avatar";
import ChecklistItems from "./checklist-items";

type Member = { id: string; name?: string | null; email: string; image?: string | null };

type Attachment = { id: string; url: string; filename: string; size: number; type: string };

type ChecklistItem = { id: string; title: string; completed: boolean; dueDate?: string | null; order?: number };

type Checklist = { id: string; title: string; items: ChecklistItem[]; itemsCount?: number };

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
  commentCount?: number;
  attachmentCount?: number;
  checklistCount?: number;
  assignmentCount?: number;
};

export default function CardModal({ cardId, onClose, onCardUpdated, initial, availableLists, onMoveCard }: { cardId: string; onClose: () => void; onCardUpdated?: (patch: { id: string; title?: string; dueDate?: string | null; hasDescription?: boolean; checklistCount?: number; assignmentCount?: number; commentCount?: number; attachmentCount?: number; members?: Member[] }) => void; initial?: Partial<CardDetail> | null; availableLists?: { id: string; title: string }[]; onMoveCard?: (toListId: string) => void }) {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [data, setData] = React.useState<CardDetail | null>(null);
  
  // Move to menu state
  const [showMoveMenu, setShowMoveMenu] = React.useState(false);
  const moveMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!showMoveMenu) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (moveMenuRef.current && !moveMenuRef.current.contains(target)) {
        setShowMoveMenu(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [showMoveMenu]);

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [dueDate, setDueDate] = React.useState<string>("");
  const [commentText, setCommentText] = React.useState("");
  const [loadingComments, setLoadingComments] = React.useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = React.useState(false);
  const [editingCommentId, setEditingCommentId] = React.useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = React.useState("");
  const [loadingChecklists, setLoadingChecklists] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [editingChecklistId, setEditingChecklistId] = React.useState<string | null>(null);
  const [editingChecklistTitle, setEditingChecklistTitle] = React.useState<string>("");
  const [showChecklistMenu, setShowChecklistMenu] = React.useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = React.useState("Checklist");
  const [copyFromChecklistId, setCopyFromChecklistId] = React.useState<string | "none">("none");
  const [boardChecklists, setBoardChecklists] = React.useState<Array<{ id: string; title: string }>>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [hasMoreComments, setHasMoreComments] = React.useState(false);
  const [commentsCursor, setCommentsCursor] = React.useState<string | null>(null);
  const [activities, setActivities] = React.useState<Array<{ id: string; type: string; details: any; createdAt: string; user?: Member | null }>>([]);
  const [creationActivity, setCreationActivity] = React.useState<{ id: string; type: string; details: any; createdAt: string; user?: Member | null } | null>(null);
  const [loadingActivity, setLoadingActivity] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [showDetails, setShowDetails] = React.useState(true);
  const [hasMoreActivity, setHasMoreActivity] = React.useState(false);
  const [activityCursor, setActivityCursor] = React.useState<string | null>(null);

  // Dates popover state
  const [showDatesMenu, setShowDatesMenu] = React.useState(false);
  const [calendarCursor, setCalendarCursor] = React.useState<Date>(new Date());
  const [useStart, setUseStart] = React.useState(false);
  const [useDue, setUseDue] = React.useState(true);
  const [tempStartDate, setTempStartDate] = React.useState<string>("");
  const [tempDueDate, setTempDueDate] = React.useState<string>("");
  const [recurring, setRecurring] = React.useState<string>("Never");
  const [reminder, setReminder] = React.useState<string>("1 Day before");

  const datesMenuWrapRef = React.useRef<HTMLDivElement | null>(null);
  const checklistMenuWrapRef = React.useRef<HTMLDivElement | null>(null);
  // Added: members menu state and ref
  const membersMenuWrapRef = React.useRef<HTMLDivElement | null>(null);
  const [showMembersMenu, setShowMembersMenu] = React.useState(false);
  const [assignableMembers, setAssignableMembers] = React.useState<Member[]>([]);

  React.useEffect(() => {
    const controller = new AbortController();
    async function fetchCard() {
      try {
        setLoadError(null);
        if (initial && initial.id === cardId) {
          const pre: CardDetail = {
            id: initial.id as string,
            title: (initial.title as string) ?? "",
            description: (initial.description as string) ?? "",
            dueDate: (initial.dueDate as string | null) ?? null,
            archived: !!initial.archived,
            list: (initial.list as any) ?? { id: "", title: "", boardId: "" },
            board: (initial.board as any) ?? { id: "", title: "" },
            labels: (initial.labels as any) ?? [],
            attachments: (initial.attachments as any) ?? [],
            comments: (initial.comments as any) ?? [],
            checklists: (initial.checklists as any) ?? [],
            members: (initial.members as any) ?? [],
            commentCount: Number(initial.commentCount || 0),
            attachmentCount: Number(initial.attachmentCount || 0),
            checklistCount: Number(initial.checklistCount || 0),
            assignmentCount: Number(initial.assignmentCount || 0),
          };
          setData(pre);
          setTitle(pre.title);
          setDescription(pre.description);
          setDueDate(pre.dueDate ? new Date(pre.dueDate).toISOString().slice(0, 16) : "");
          if ((pre.checklistCount || 0) > 0) {
            setLoadingChecklists(true);
          }
          if (!creationActivity) {
            const createdAtISO = (pre as any).createdAt ? (pre as any).createdAt : new Date().toISOString();
            setCreationActivity({ id: `local-${cardId}`, type: "CARD_CREATED", details: { message: "Someone created this card" }, createdAt: createdAtISO, user: null });
          }
          setLoading(false);
        } else {
          setLoading(true);
        }
        const resp = await fetch(`/api/cards/${cardId}?summary=1`, { signal: controller.signal });
        if (!resp.ok) {
          const status = resp.status;
          setLoadError(status === 404 ? "Card not found" : "Failed to load card");
          setLoading(false);
          return;
        }
        const t0 = performance.now();
        const summary = await resp.json();
        console.info("[CardModalPerf] summary_ms=", Math.round(performance.now() - t0));
        const normalized = {
          ...summary,
          attachments: Array.isArray(summary.attachments) ? summary.attachments : [],
          comments: Array.isArray(summary.comments) ? summary.comments : [],
          checklists: Array.isArray(summary.checklists) ? summary.checklists : [],
          members: Array.isArray(summary.members) ? summary.members : [],
          commentCount: Number(summary.commentCount || 0),
          attachmentCount: Number(summary.attachmentCount || 0),
          checklistCount: Number(summary.checklistCount || 0),
          assignmentCount: Number(summary.assignmentCount || 0),
        } as CardDetail;
        setData(normalized);
        setTitle(normalized.title ?? "");
        setDescription(normalized.description ?? "");
        setDueDate(normalized.dueDate ? new Date(normalized.dueDate).toISOString().slice(0, 16) : "");
        setLoading(false);
        if ((normalized.checklistCount || 0) > 0) {
          setLoadingChecklists(true);
        }
        if (!creationActivity) {
          const createdAtISO = (normalized as any).createdAt ? (normalized as any).createdAt : new Date().toISOString();
          setCreationActivity({ id: `local-${cardId}`, type: "CARD_CREATED", details: { message: "Someone created this card" }, createdAt: createdAtISO, user: null });
        }
        try {
          const respOne = await fetch(`/api/cards/${cardId}/activity?order=asc&type=CARD_CREATED&take=1`, { signal: controller.signal });
          if (respOne.ok) {
            const one = await respOne.json();
            if (Array.isArray(one) && one.length > 0) {
              setCreationActivity(one[0]);
            } else {
              const createdAtISO = normalized && (normalized as any).createdAt ? (normalized as any).createdAt : new Date().toISOString();
              setCreationActivity({ id: `local-${cardId}`, type: "CARD_CREATED", details: { message: "Someone created this card" }, createdAt: createdAtISO, user: null });
            }
          }
        } catch {
          const createdAtISO = normalized && (normalized as any).createdAt ? (normalized as any).createdAt : new Date().toISOString();
          setCreationActivity({ id: `local-${cardId}`, type: "CARD_CREATED", details: { message: "Someone created this card" }, createdAt: createdAtISO, user: null });
        }
        // Run heavy loads just after paint to avoid long idle delays
        const schedule = (fn: () => void) => {
          try {
            if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
              window.requestAnimationFrame(() => fn());
            } else {
              setTimeout(fn, 0);
            }
          } catch {
            setTimeout(fn, 0);
          }
        };
        schedule(async () => {
          try {
            setLoadingChecklists(true);
            const wantDescription = !!summary.hasDescription && !(summary.description && summary.description.length > 0);
            const tf = async (name: string, url: string) => {
              const t = performance.now();
              const r = await fetch(url, { signal: controller.signal });
              console.info(`[CardModalPerf] ${name}_ms=`, Math.round(performance.now() - t));
              return r;
            };
            const TAKE = 20;
            const wantAttachments = (normalized.attachmentCount || 0) > 0;
            const wantChecklists = (normalized.checklistCount || 0) > 0;
            const promises: Array<Promise<any>> = [];
            promises.push(wantAttachments ? tf("attachments", `/api/cards/${cardId}/attachments?take=${TAKE}`) : Promise.resolve(null));
            promises.push(wantChecklists ? tf("checklists", `/api/cards/${cardId}/checklists?withItems=0`) : Promise.resolve(null));
            promises.push(wantDescription ? tf("description", `/api/cards/${cardId}/description`) : Promise.resolve(null));
            const [attachmentsRes, checklistsRes, descriptionRes] = await Promise.allSettled(promises);
            const attachmentsOk = attachmentsRes.status === "fulfilled" && attachmentsRes.value && attachmentsRes.value.ok;
            const checklistsOk = checklistsRes.status === "fulfilled" && checklistsRes.value && checklistsRes.value.ok;
            const descriptionOk = wantDescription && descriptionRes.status === "fulfilled" && descriptionRes.value && descriptionRes.value.ok;

            const attachments = attachmentsOk ? await attachmentsRes.value.json() : undefined;
            const checklists = checklistsOk ? await checklistsRes.value.json() : undefined;
            const descObj = descriptionOk ? await descriptionRes.value.json() : undefined;

            setData((d) => {
              if (!d) return d;
              return {
                ...d,
                ...(attachments !== undefined ? { attachments } : {}),
                ...(checklists !== undefined ? { checklists: (checklists as any[]).map((cl: any) => ({ id: cl.id, title: cl.title, items: [], itemsCount: cl.itemsCount ?? 0 })) } : {}),
                ...(descObj !== undefined ? { description: descObj.description ?? "" } : {}),
              };
            });
            if (Array.isArray(attachments)) {
              const takeA = TAKE;
              setHasMoreAttachments(attachments.length === takeA);
              setAttachmentsCursor(attachments.length ? attachments[attachments.length - 1].id : null);
            }

            if (Array.isArray(checklists)) {
              const firstIds = (checklists as any[]).slice(0, 3).map((cl: any) => cl.id);
              if (firstIds.length) {
                const batched = await tf("items", `/api/cards/${cardId}/checklists/items?ids=${encodeURIComponent(firstIds.join(","))}&take=200`);
                if (batched.ok) {
                  const rows = await batched.json();
                  const itemsById = new Map<string, ChecklistItem[]>();
                  rows.forEach((r: any) => itemsById.set(r.id, r.items || []));
                  setData((d) => {
                    if (!d) return d;
                    return {
                      ...d,
                      checklists: d.checklists.map((c) => (itemsById.has(c.id) ? { ...c, items: itemsById.get(c.id)! } : c)),
                    };
                  });
                }
              }
            }
          } finally {
            setLoadingChecklists(false);
          }
        });
      } catch (err) {
        if ((err as any)?.name !== "AbortError") {
          console.error("Failed to load card", err);
          setLoadingComments(false);
          setLoadingChecklists(false);
          setLoadError("Failed to load card");
          setLoading(false);
        }
      }
    }
    fetchCard();
    return () => controller.abort();
  }, [cardId]);

  React.useEffect(() => {
    if (!showDetails) return;
    const controller = new AbortController();
    async function loadDetails() {
      try {
        setLoadingComments(true);
        setLoadingActivity(true);
        const TAKE = 20;
        const wantComments = (data?.commentCount || 0) > 0;
        const [commentsRes, activityRes] = await Promise.allSettled([
          wantComments ? fetch(`/api/cards/${cardId}/comments?take=${TAKE}`, { signal: controller.signal }) : Promise.resolve(null),
          fetch(`/api/cards/${cardId}/activity?take=200`, { signal: controller.signal }),
        ]);
        const commentsOk = commentsRes.status === "fulfilled" && commentsRes.value && commentsRes.value.ok;
        const activityOk = activityRes.status === "fulfilled" && activityRes.value && activityRes.value.ok;
        const comments = commentsOk && commentsRes.value ? await commentsRes.value.json() : undefined;
        let activity: any[] = activityOk ? await activityRes.value.json() : [];
        const serverCreation = activity.filter((a) => a.type === "CARD_CREATED");
        const creation = serverCreation.length ? serverCreation.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0] : creationActivity;
        const withoutCreation = activity.filter((a) => a.type !== "CARD_CREATED").sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (creation) activity = [...withoutCreation, creation];
        if (Array.isArray(comments)) {
          setData((d) => (d ? { ...d, comments } : d));
          const take = TAKE;
          setHasMoreComments(comments.length === take);
          setCommentsCursor(comments.length ? comments[comments.length - 1].id : null);
        }
        if (Array.isArray(activity)) {
          setActivities(activity);
          const takeA = 50;
          setHasMoreActivity(activity.length === takeA);
          setActivityCursor(activity.length ? activity[activity.length - 1].id : null);
        }
      } finally {
        setLoadingComments(false);
        setLoadingActivity(false);
      }
    }
    loadDetails();
    return () => controller.abort();
  }, [showDetails]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Reset input so same file can be selected again if needed
    e.target.value = "";

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const upRes = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });

      if (!upRes.ok) {
        console.error("Upload failed", await upRes.text());
        alert("Failed to upload file");
        return;
      }
      const upData = await upRes.json();

      const attRes = await fetch(`/api/cards/${cardId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: upData.url,
          filename: upData.filename,
          type: upData.type,
          size: upData.size
        }),
      });

      if (attRes.ok) {
        const newAtt = await attRes.json();
        setData((d) => (d ? { ...d, attachments: [...d.attachments, newAtt], attachmentCount: (d.attachmentCount || 0) + 1 } : d));
        
        // Fetch activity for attachment
        try {
            const actResp = await fetch(`/api/cards/${cardId}/activity?take=5&order=desc&t=${Date.now()}`);
            if (actResp.ok) {
                const latest = await actResp.json();
                if (Array.isArray(latest) && latest.length > 0) {
                     setActivities((curr) => {
                         // Merge new activities
                         const newActs = latest.filter(a => !curr.some(existing => existing.id === a.id));
                         return [...newActs, ...curr];
                     });
                }
            }
        } catch {}

        if (onCardUpdated) {
          onCardUpdated({ 
            id: cardId, 
            attachmentCount: (data?.attachmentCount || 0) + 1 
          });
        }
      }
    } catch (err) {
      console.error("Failed to upload/attach file", err);
      alert("Failed to attach file");
    } finally {
      setIsUploading(false);
    }
  }

  // Keep tempDueDate synced with controlled dueDate input
  React.useEffect(() => {
    setTempDueDate(dueDate || "");
  }, [dueDate]);

  function openDatesMenu() {
    setShowDatesMenu((s) => !s);
  }

  // Added: open members menu, fetch global members, and outside-click handling
  function openMembersMenu() {
    setShowMembersMenu((s) => {
      const next = !s;
      if (!s) fetchAssignableMembers();
      return next;
    });
  }

  async function fetchAssignableMembers() {
    try {
      const resp = await fetch(`/api/members`);
      if (resp.ok) {
        const members = await resp.json();
        setAssignableMembers(members);
      }
    } catch (err) {
      console.error("Failed to fetch members", err);
    }
  }

  React.useEffect(() => {
    if (!showMembersMenu) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      const container = membersMenuWrapRef.current;
      if (container && !container.contains(target)) {
        setShowMembersMenu(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [showMembersMenu]);

  React.useEffect(() => {
    if (!showDatesMenu) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      const container = datesMenuWrapRef.current;
      if (container && !container.contains(target)) {
        setShowDatesMenu(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [showDatesMenu]);

  // Added: toggle assignment for a member
  async function toggleAssignment(m: Member) {
    const assigned = !!data?.members?.some((mm) => mm.id === m.id);
    try {
      if (!assigned) {
        const resp = await fetch(`/api/cards/${cardId}/assignments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: m.id }),
        });
        if (resp.ok) {
          const created = await resp.json();
          setData((d) => (d ? { ...d, members: [...d.members, created.user] } : d));
          if (onCardUpdated) {
            const nextMembers = [...(data?.members ?? []), created.user];
            onCardUpdated({ id: cardId, members: nextMembers, assignmentCount: nextMembers.length });
          }
        }
      } else {
        const resp = await fetch(`/api/cards/${cardId}/assignments/${m.id}`, { method: "DELETE" });
        if (resp.ok) {
          const nextMembers = (data?.members ?? []).filter((mm) => mm.id !== m.id);
          setData((d) => (d ? { ...d, members: nextMembers } : d));
          if (onCardUpdated) onCardUpdated({ id: cardId, members: nextMembers, assignmentCount: nextMembers.length });
        }
      }
    } catch (err) {
      console.error("Failed to toggle assignment", err);
    }
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
        if (onCardUpdated) onCardUpdated({ id: cardId, title: updated.title, dueDate: updated.dueDate ?? null });
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
        if (onCardUpdated) onCardUpdated({ id: cardId, dueDate: updated.dueDate ?? null });
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

  async function updateComment(commentId: string) {
    const content = editingCommentText.trim();
    if (!content) return;
    try {
      const resp = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (resp.ok) {
        const updated = await resp.json();
        setData((d) => (d ? { ...d, comments: d.comments.map((c) => (c.id === commentId ? updated : c)) } : d));
        setEditingCommentId(null);
        setEditingCommentText("");
      }
    } catch (err) {
      console.error("Failed to update comment", err);
    }
  }

  async function deleteComment(commentId: string) {
    if (!confirm("Delete this comment?")) return;
    try {
      const resp = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
      if (resp.ok) {
        setData((d) => (d ? { ...d, comments: d.comments.filter((c) => c.id !== commentId) } : d));
      }
    } catch (err) {
      console.error("Failed to delete comment", err);
    }
  }

  async function loadMoreComments() {
    if (!hasMoreComments || !commentsCursor) return;
    try {
      setLoadingMoreComments(true);
      const resp = await fetch(`/api/cards/${cardId}/comments?take=50&cursor=${encodeURIComponent(commentsCursor)}`);
      if (resp.ok) {
        const next: Comment[] = await resp.json();
        setData((d) => (d ? { ...d, comments: [...d.comments, ...next] } : d));
        const take = 50;
        setHasMoreComments(next.length === take);
        setCommentsCursor(next.length ? next[next.length - 1].id : commentsCursor);
      }
    } catch (err) {
      console.error("Failed to load more comments", err);
    } finally {
      setLoadingMoreComments(false);
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

  React.useEffect(() => {
    if (!showChecklistMenu) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      const container = checklistMenuWrapRef.current;
      if (container && !container.contains(target)) {
        setShowChecklistMenu(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [showChecklistMenu]);

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
        
        // Fetch the new activity to show the correct user immediately
        try {
            const actResp = await fetch(`/api/cards/${cardId}/activity?take=1&order=desc`);
            if (actResp.ok) {
                const latest = await actResp.json();
                if (Array.isArray(latest) && latest.length > 0) {
                     setActivities((curr) => [latest[0], ...curr]);
                }
            }
        } catch {}

        if (onCardUpdated) {
          const nextCount = (data?.checklists.length ?? 0) + 1;
          onCardUpdated({ id: cardId, checklistCount: nextCount });
        }
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
        const nextCount = Math.max(0, (data?.checklists.length ?? 0) - 1);
        setData((d) => (d ? { ...d, checklists: d.checklists.filter((c) => c.id !== checklistId) } : d));
        if (onCardUpdated) onCardUpdated({ id: cardId, checklistCount: nextCount });
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
        
        // Fetch activity for checklist item creation
        try {
            const actResp = await fetch(`/api/cards/${cardId}/activity?take=1&order=desc`);
            if (actResp.ok) {
                const latest = await actResp.json();
                if (Array.isArray(latest) && latest.length > 0) {
                     setActivities((curr) => {
                         if (curr.some(a => a.id === latest[0].id)) return curr;
                         return [latest[0], ...curr];
                     });
                }
            }
        } catch {}

      }
    } catch (err) {
      console.error("Failed to add checklist item", err);
    }
  }

  async function updateChecklistItem(itemId: string, data: Partial<ChecklistItem>) {
    try {
      const resp = await fetch(`/api/checklist-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (resp.ok) {
        setData((d) => {
          if (!d) return d;
          return {
            ...d,
            checklists: d.checklists.map((c) => ({
              ...c,
              items: c.items.map((it) => (it.id === itemId ? { ...it, ...data } : it)),
            })),
          };
        });

        if (data.completed !== undefined) {
             // Fetch activity for checklist toggle
            try {
                const actResp = await fetch(`/api/cards/${cardId}/activity?take=1&order=desc`);
                if (actResp.ok) {
                    const latest = await actResp.json();
                    if (Array.isArray(latest) && latest.length > 0) {
                         const diff = Date.now() - new Date(latest[0].createdAt).getTime();
                         if (diff < 5000) {
                             setActivities((curr) => {
                                 if (curr.some(a => a.id === latest[0].id)) return curr;
                                 return [latest[0], ...curr];
                             });
                         }
                    }
                }
            } catch {}
        }
      }
    } catch (err) {
      console.error("Failed to update item", err);
    }
  }

  async function handleReorderItems(checklistId: string, newItems: ChecklistItem[]) {
     setData((d) => {
         if (!d) return d;
         return {
             ...d,
             checklists: d.checklists.map(c => c.id === checklistId ? { ...c, items: newItems } : c)
         };
     });

     try {
         await fetch(`/api/checklists/${checklistId}/items`, {
             method: "PUT",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ items: newItems.map(i => ({ id: i.id, order: i.order })) })
         });
     } catch (err) {
         console.error("Failed to reorder items", err);
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




  const [hasMoreAttachments, setHasMoreAttachments] = React.useState(false);
  const [attachmentsCursor, setAttachmentsCursor] = React.useState<string | null>(null);
  const [loadingMoreAttachments, setLoadingMoreAttachments] = React.useState(false);

  async function loadMoreAttachments() {
    if (!hasMoreAttachments || !attachmentsCursor) return;
    try {
      setLoadingMoreAttachments(true);
      const resp = await fetch(`/api/cards/${cardId}/attachments?take=50&cursor=${encodeURIComponent(attachmentsCursor)}`);
      if (resp.ok) {
        const next: Attachment[] = await resp.json();
        setData((d) => (d ? { ...d, attachments: [...d.attachments, ...next] } : d));
        const takeA = 50;
        setHasMoreAttachments(next.length === takeA);
        setAttachmentsCursor(next.length ? next[next.length - 1].id : attachmentsCursor);
      }
    } catch (err) {
      console.error("Failed to load more attachments", err);
    } finally {
      setLoadingMoreAttachments(false);
    }
  }

  const scrollWrapRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!loading && scrollWrapRef.current) {
      scrollWrapRef.current.scrollTop = 0;
    }
  }, [loading, cardId]);

  if (loading || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <div className="w-full max-w-[800px] rounded bg-background p-4 shadow dark:bg-neutral-900">
          <p className="text-sm">{loadError ? loadError : "Loading card..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 top-4 bottom-4 z-50 card-modal-root">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        ref={scrollWrapRef}
        className="absolute inset-0 flex items-stretch justify-center overflow-hidden p-2 sm:p-4 md:p-8"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="flex h-full w-full max-w-[980px] flex-col rounded-2xl border border-black/10 bg-background text-foreground shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          <div className="p-4 border-b border-black/10 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2 w-full">
              <input type="checkbox" checked={!!data.archived} onChange={(e) => toggleCardArchived(e.target.checked)} />
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveBasics}
                className="text-lg font-semibold bg-transparent outline-none w-full"
              />
            </div>
            <div className="relative ml-3" ref={moveMenuRef}>
              <button 
                onClick={() => setShowMoveMenu(!showMoveMenu)} 
                className="text-xs rounded px-2 py-1 bg-foreground/5 hover:bg-foreground/10 transition-colors whitespace-nowrap"
              >
                <span className="hidden sm:inline">Move to</span>
                <span className="sm:hidden">&gt;&gt;</span>
              </button>
              {showMoveMenu && availableLists && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded border border-black/10 dark:border-neutral-800 bg-background dark:bg-neutral-900 shadow-lg z-50 py-1 max-h-60 overflow-y-auto">
                  {availableLists.map((l) => (
                    <button
                      key={l.id}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-foreground/5 truncate flex items-center justify-between"
                      onClick={() => {
                        if (onMoveCard) {
                            onMoveCard(l.id);
                            setData((d) => (d ? { ...d, list: { ...d.list, id: l.id, title: l.title } } : d));
                        }
                        setShowMoveMenu(false);
                      }}
                    >
                      <span className="truncate">{l.title}</span>
                      {data?.list?.id === l.id && <span className="ml-2 opacity-50 text-[10px] shrink-0">(current)</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={onClose} className="ml-2 text-xs rounded px-2 py-1 bg-foreground/5 hover:bg-foreground/10 transition-colors">
              <span className="hidden sm:inline">Close</span>
              <span className="sm:hidden text-sm font-bold">&times;</span>
            </button>
          </div>

          <div className="grid flex-1 min-h-0 grid-cols-1 items-start gap-4 p-3 md:gap-6 md:p-4 lg:grid-cols-[1fr_320px]">
            <div className="flex h-full min-h-0 flex-col space-y-6 overflow-y-auto pr-1">
              <div className="flex items-center gap-2">
                <span className="text-xs">Add:</span>
                <button className="text-xs rounded px-2 py-1 bg-foreground/5 hover:bg-foreground/10 transition-colors">Labels</button>
                <div className="relative" ref={datesMenuWrapRef}>
                  <button onClick={openDatesMenu} className="text-xs rounded px-2 py-1 bg-foreground/5 hover:bg-foreground/10 transition-colors">Dates</button>
                  {showDatesMenu && (
                    <div className="absolute z-20 mt-2 w-[280px] rounded border border-black/10 dark:border-neutral-800 bg-background dark:bg-neutral-900 p-3 shadow">
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
                          <div className="grid grid-cols-1 gap-2">
                            <input
                              type="date"
                              value={tempDueDate ? tempDueDate.split("T")[0] : ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                setTempDueDate((prev) => {
                                  const time = prev ? prev.split("T")[1] || "" : "";
                                  return v ? `${v}${time ? `T${time}` : ""}` : "";
                                });
                              }}
                              disabled={!useDue}
                              className="border rounded px-1 py-[2px] bg-background"
                            />
                            <input
                              type="time"
                              value={tempDueDate ? tempDueDate.split("T")[1] || "" : ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                setTempDueDate((prev) => {
                                  const date = prev ? prev.split("T")[0] || "" : "";
                                  return date ? `${date}${v ? `T${v}` : ""}` : "";
                                });
                              }}
                              disabled={!useDue}
                              className="border rounded px-1 py-[2px] bg-background w-full"
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
                <div className="relative" ref={checklistMenuWrapRef}>
                  <button onClick={openChecklistMenu} className="text-xs rounded px-2 py-1 bg-foreground/5 hover:bg-foreground/10 transition-colors">Checklist</button>
                  {showChecklistMenu && (
                    <div className="absolute z-20 mt-2 w-64 rounded border border-black/10 dark:border-neutral-800 bg-background dark:bg-neutral-900 p-3 shadow">
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
                <div className="relative" ref={membersMenuWrapRef}>
                  <button onClick={openMembersMenu} className="text-xs rounded px-2 py-1 bg-foreground/5 hover:bg-foreground/10 transition-colors">Members</button>
                  {showMembersMenu && (
                    <div className="absolute z-20 mt-2 w-64 rounded border border-black/10 dark:border-neutral-800 bg-background dark:bg-neutral-900 p-3 shadow">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold">Assign members</p>
                        <button className="text-xs" onClick={() => setShowMembersMenu(false)}>×</button>
                      </div>
                      {assignableMembers.length === 0 ? (
                        <p className="text-xs text-foreground/60">No members found</p>
                      ) : (
                        <ul className="space-y-2 max-h-48 overflow-y-auto">
                          {assignableMembers.map((m) => {
                            const assigned = !!data?.members?.some((mm) => mm.id === m.id);
                            return (
                              <li key={m.id} className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm">{m.name || m.email}</p>
                                  <p className="text-[11px] text-foreground/60">{m.email}</p>
                                </div>
                                <button
                                  onClick={() => toggleAssignment(m)}
                                  className={`text-xs rounded px-2 py-1 ${assigned ? "bg-foreground text-background" : "bg-foreground/5 hover:bg-foreground/10"}`}
                                >
                                  {assigned ? "Assigned" : "Assign"}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                   )}
                 </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex h-7 w-7 items-center justify-center rounded bg-foreground/5 hover:bg-foreground/10 transition-colors text-foreground text-xs disabled:opacity-50"
                  title="Add attachment"
                >
                  {isUploading ? (
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "📎"
                  )}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              <div className="rounded border border-black/10 dark:border-neutral-800 p-2">
                <div className="flex items-center gap-3 text-xs">
                  {tempStartDate && (
                    <span className="px-2 py-1 rounded bg-background border">Start {new Date(tempStartDate).toLocaleDateString()}</span>
                  )}
                  {data?.dueDate && (
                    <button 
                      onClick={openDatesMenu} 
                      className="px-2 py-1 rounded bg-background border hover:bg-foreground/5 transition-colors text-left"
                      title="Change due date"
                    >
                      Due {new Date(data.dueDate).toLocaleString()}
                    </button>
                  )}
                  {!!(data?.members && data.members.length) && (
                    <div className="ml-auto flex items-center gap-1">
                      {data.members.slice(0, 6).map((m) => (
                        <Avatar key={m.id} name={m.name || undefined} email={m.email} image={m.image || undefined} size={18} />
                      ))}
                      {data.members.length > 6 && (
                        <span className="text-[10px] text-foreground/60">+{data.members.length - 6}</span>
                      )}
                    </div>
                  )}
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
                      <li key={a.id} className="flex items-center justify-between border border-black/10 dark:border-neutral-800 rounded p-2 bg-foreground/5">
                        <a href={a.url} target="_blank" rel="noreferrer" className="text-sm truncate max-w-[60%] hover:underline text-primary">{a.filename || a.url}</a>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-foreground/60">{a.type || "link"}</span>
                          <a href={a.url} download target="_blank" rel="noreferrer" className="text-xs bg-foreground/10 hover:bg-foreground/20 rounded px-2 py-1">Download</a>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {hasMoreAttachments && (
                    <div className="mt-2 flex justify-center">
                      <button
                        onClick={loadMoreAttachments}
                        disabled={loadingMoreAttachments}
                        className={`text-xs rounded px-3 py-1 ${loadingMoreAttachments ? "bg-foreground/10" : "bg-foreground text-background"}`}
                      >
                        {loadingMoreAttachments ? "Loading..." : "Load more"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Checklists</p>
                </div>
                {(data.checklistCount || 0) > 0 && data.checklists.length === 0 ? (
                  <div className="mt-2 space-y-2 animate-pulse">
                    <div className="h-4 rounded bg-foreground/10 w-2/5" />
                    <div className="h-3 rounded bg-foreground/10 w-4/5" />
                    <div className="h-3 rounded bg-foreground/10 w-3/5" />
                  </div>
                ) : data.checklists.length === 0 ? (
                  <p className="text-xs text-foreground/60 mt-2">No checklists</p>
                ) : (
                  <div className="mt-3 space-y-4">
                    {data.checklists.map((cl) => (
                      <div key={cl.id} className="rounded border border-black/10 dark:border-neutral-800 p-3">
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
                        <ChecklistItems
                          checklist={cl}
                          onUpdateItem={updateChecklistItem}
                          onDeleteItem={deleteChecklistItem}
                          onAddItem={addChecklistItem}
                          onReorderItems={handleReorderItems}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex h-full min-h-0 flex-col overflow-y-auto lg:mt-0">
              <div className="flex min-h-0 flex-col rounded border border-black/10 bg-foreground/5 p-3 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Comments and activity</p>
                  <button onClick={() => setShowDetails((s) => !s)} className="text-xs rounded px-3 py-1 border bg-background">
                    {showDetails ? "Hide details" : "Show details"}
                  </button>
                </div>
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
                {!showDetails ? (
                  <>
                    <ul className="mt-3 space-y-3 overflow-y-auto flex-1 min-h-0">
                      {!creationActivity ? (
                        <li className="text-xs text-foreground/60">No activity yet</li>
                      ) : (
                        [creationActivity].map((a) => (
                          <li key={`a-${a.id}`} className="text-sm">
                            <div className="flex items-center gap-2">
                              <Avatar image={a.user?.image || ""} name={a.user?.name || a.user?.email || ""} email={a.user?.email || ""} size={20} />
                              <span className="font-semibold">{a.user?.name || a.user?.email || "Someone"}</span>
                              <span className="text-foreground/80">{String(a.details?.message || "Someone created this card")}</span>
                            </div>
                            <div className="text-xs text-foreground/60">{new Date(a.createdAt).toLocaleString()}</div>
                          </li>
                        ))
                      )}
                    </ul>
                  </>
                ) : loadingComments || loadingActivity ? (
                  <div className="mt-3 space-y-2 animate-pulse">
                    <div className="h-3 rounded bg-foreground/10 w-3/5" />
                    <div className="h-3 rounded bg-foreground/10 w-2/5" />
                    <div className="h-3 rounded bg-foreground/10 w-4/5" />
                  </div>
                ) : activities.length === 0 && data.comments.length === 0 ? (
                  <p className="mt-3 text-xs text-foreground/60">No activity yet</p>
                ) : (
                  <>
                    <ul className="mt-3 space-y-3 overflow-y-auto flex-1 min-h-0">
                      {(() => {
                        const mergedActivity = activities.filter((a) => a.type !== "CARD_CREATED").map((a) => ({ kind: "activity" as const, createdAt: a.createdAt, a }));
                        const merged = [...mergedActivity, ...data.comments.map((c) => ({ kind: "comment" as const, createdAt: c.createdAt, c }))]
                          .sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime());
                        const items = [...merged];
                        if (creationActivity) items.push({ kind: "activity" as const, createdAt: creationActivity.createdAt, a: creationActivity });
                        return items.map((item) => (
                          item.kind === "activity" ? (
                            <li key={`a-${item.a.id}`} className="text-sm">
                              <div className="grid grid-cols-[auto_1fr] gap-x-2">
                                <div className="mt-1">
                                  <Avatar image={item.a.user?.image || ""} name={item.a.user?.name || item.a.user?.email || ""} email={item.a.user?.email || ""} size={20} />
                                </div>
                                <div>
                                  <div>
                                    <span className="font-semibold mr-1">{item.a.user?.name || item.a.user?.email || "Someone"}</span>
                                    <span className="text-foreground/80">{String(item.a.details?.message || (item.a.type === "CARD_CREATED" ? "created this card" : item.a.type))}</span>
                                  </div>
                                  <div className="text-xs text-foreground/60">{new Date(item.createdAt).toLocaleString()}</div>
                                </div>
                              </div>
                            </li>
                          ) : (
                            <li key={`c-${item.c.id}`} className="text-sm group">
                              <div className="grid grid-cols-[auto_1fr] gap-x-2">
                                <div className="mt-1">
                                  <Avatar image={item.c.author?.image || ""} name={item.c.author?.name || item.c.author?.email || ""} email={item.c.author?.email || ""} size={24} />
                                </div>
                                <div className="w-full">
                                  <div className="flex items-center justify-between">
                                    <div className="text-xs font-semibold text-foreground/80">
                                      {item.c.author?.name || item.c.author?.email}
                                      <span className="font-normal text-foreground/60 ml-2">{new Date(item.c.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 flex gap-2">
                                      <button onClick={() => { setEditingCommentId(item.c.id); setEditingCommentText(item.c.content); }} className="text-[10px] text-foreground/60 hover:text-foreground">Edit</button>
                                      <button onClick={() => deleteComment(item.c.id)} className="text-[10px] text-foreground/60 hover:text-red-500">Delete</button>
                                    </div>
                                  </div>
                                  {editingCommentId === item.c.id ? (
                                    <div className="mt-1">
                                      <textarea
                                        value={editingCommentText}
                                        onChange={(e) => setEditingCommentText(e.target.value)}
                                        className="w-full text-sm border rounded p-1 bg-background h-16"
                                      />
                                      <div className="flex gap-2 mt-1">
                                        <button onClick={() => updateComment(item.c.id)} className="text-xs rounded px-2 py-1 bg-foreground text-background">Save</button>
                                        <button onClick={() => setEditingCommentId(null)} className="text-xs rounded px-2 py-1 bg-foreground/5">Cancel</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="mt-0.5 text-foreground/90">{item.c.content}</div>
                                  )}
                                </div>
                              </div>
                            </li>
                          )
                        ));
                      })()}
                    </ul>
                   {hasMoreComments && (
                     <div className="mt-3 flex justify-center">
                       <button
                         onClick={loadMoreComments}
                         disabled={loadingMoreComments}
                         className={`text-xs rounded px-3 py-1 ${loadingMoreComments ? "bg-foreground/10" : "bg-foreground text-background"}`}
                       >
                         {loadingMoreComments ? "Loading..." : "Load more"}
                       </button>
                     </div>
                   )}
                 </>
                )}
               </div>

              </div>

          </div>
        </div>
      </div>
    </div>
  );
}
