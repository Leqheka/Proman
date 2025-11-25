"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import CreateCard from "./create-card";
import AddListTile from "./add-list-tile";
import CardModal from "./card-modal";
import Avatar from "./avatar";

export type CardItem = { id: string; title: string; order: number; listId?: string; dueDate?: string | null; hasDescription?: boolean; checklistCount?: number; commentCount?: number; attachmentCount?: number; assignmentCount?: number; members?: Array<{ id: string; name: string | null; email: string; image: string | null }> };
export type ListItem = { id: string; title: string; order: number; cards: CardItem[] };

function SortableListWrapperBase({ list, children }: { list: ListItem; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: list.id });
  const style = { transform: CSS.Transform.toString(transform), transition } as React.CSSProperties;
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="w-72 shrink-0 self-start mt-2 mb-4 rounded-lg border border-black/10 dark:border-white/15 bg-gray-100 p-3 max-h-full flex flex-col">
      {children}
    </div>
  );
}

const SortableListWrapper = React.memo(SortableListWrapperBase, (prev, next) => {
  return prev.list.id === next.list.id && prev.list.title === next.list.title && prev.list.cards === next.list.cards;
});

function isTempCardId(id: string) {
  return id.startsWith("temp-card-");
}

function formatDueDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const month = d.toLocaleString(undefined, { month: "short" });
  const day = d.getDate();
  return `${month} ${day}`;
}

function getDueStatus(iso?: string | null): "overdue" | "today" | "soon" | "none" {
  if (!iso) return "none";
  const due = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  if (due.getTime() < startToday.getTime()) return "overdue";
  if (due.getTime() <= endToday.getTime()) return "today";
  const soonThreshold = new Date(startToday.getTime() + 3 * 24 * 60 * 60 * 1000);
  if (due.getTime() <= soonThreshold.getTime()) return "soon";
  return "none";
}

function SortableCardBase({ card, onOpen, onToggleArchive, onUpdateTitle }: { card: CardItem; onOpen: (id: string) => void; onToggleArchive: (card: CardItem, checked: boolean) => void; onUpdateTitle: (cardId: string, newTitle: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: card.id });
  const style = { transform: CSS.Transform.toString(transform), transition } as React.CSSProperties;
  const prefetched = React.useRef(false);
  const dueStatus = getDueStatus(card.dueDate);
  const dueClasses =
    dueStatus === "overdue"
      ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
      : dueStatus === "today"
      ? "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800"
      : dueStatus === "soon"
      ? "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800"
      : "bg-background border border-black/10 dark:border-white/15";
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onMouseEnter={() => {
        if (prefetched.current) return;
        if (isTempCardId(card.id)) return;
        prefetched.current = true;
        fetch(`/api/cards/${card.id}?summary=1`).catch(() => {});
      }}
      onClick={() => {
        if (isTempCardId(card.id)) return; // guard against opening temp card modal
        onOpen(card.id);
      }}
      className="group relative rounded border border-black/10 dark:border-white/15 bg-foreground/5 p-3 hover:bg-foreground/10 hover:shadow-sm transition-colors cursor-pointer"
    >
      {/* Header: checkbox always visible next to title */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onToggleArchive(card, e.target.checked)}
        />
        <span className="text-sm font-medium truncate">
          {card.title}
        </span>
      </div>


      {/* Metadata icon row: wraps to new lines when crowded */}
      {(card.dueDate || card.hasDescription || (card.checklistCount ?? 0) > 0 || (card.commentCount ?? 0) > 0 || (card.attachmentCount ?? 0) > 0 || (card.assignmentCount ?? 0) > 0 || (card.members?.length ?? 0) > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-foreground/70">
          {card.dueDate && (
            <span className={`inline-flex items-center gap-1 px-2 py-[2px] rounded ${dueClasses}`}>
              <span
                className="w-3.5 h-3.5 inline-block"
                style={{
                  WebkitMaskImage: 'url(/icons/calendar.svg)',
                  maskImage: 'url(/icons/calendar.svg)',
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
              <span>{formatDueDate(card.dueDate)}</span>
            </span>
          )}
          {card.hasDescription && (
            <span className="inline-flex items-center gap-1">
              <span
                className="w-3.5 h-3.5 inline-block"
                style={{
                  WebkitMaskImage: 'url(/icons/note.svg)',
                  maskImage: 'url(/icons/note.svg)',
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
            </span>
          )}
          {(card.checklistCount ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1">
              <span
                className="w-3.5 h-3.5 inline-block"
                style={{
                  WebkitMaskImage: 'url(/icons/checklist.svg)',
                  maskImage: 'url(/icons/checklist.svg)',
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
              <span>{card.checklistCount}</span>
            </span>
          )}
          {(card.commentCount ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1">
              <span
                className="w-3.5 h-3.5 inline-block"
                style={{
                  WebkitMaskImage: 'url(/icons/comment.svg)',
                  maskImage: 'url(/icons/comment.svg)',
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
              <span>{card.commentCount}</span>
            </span>
          )}
          {(card.attachmentCount ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1">
              <span
                className="w-3.5 h-3.5 inline-block"
                style={{
                  WebkitMaskImage: 'url(/icons/attachment.svg)',
                  maskImage: 'url(/icons/attachment.svg)',
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
              <span>{card.attachmentCount}</span>
            </span>
          )}
          {/* Move avatars to align with icons */}
          {!!(card.members && card.members.length) && (
            <div className="ml-auto flex items-center gap-1">
              {card.members.slice(0, 5).map((m) => (
                <Avatar key={m.id} name={m.name || undefined} email={m.email} image={m.image || undefined} size={18} />
              ))}
              {card.members.length > 5 && (
                <span className="text-[10px] text-foreground/60">+{card.members.length - 5}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const SortableCard = React.memo(SortableCardBase, (prev, next) => {
  const a = prev.card;
  const b = next.card;
  if (a.id !== b.id) return false;
  if (a.title !== b.title) return false;
  if (a.dueDate !== b.dueDate) return false;
  if ((a.hasDescription ?? false) !== (b.hasDescription ?? false)) return false;
  if ((a.checklistCount ?? 0) !== (b.checklistCount ?? 0)) return false;
  if ((a.commentCount ?? 0) !== (b.commentCount ?? 0)) return false;
  if ((a.attachmentCount ?? 0) !== (b.attachmentCount ?? 0)) return false;
  if ((a.assignmentCount ?? 0) !== (b.assignmentCount ?? 0)) return false;
  const lenA = a.members?.length ?? 0;
  const lenB = b.members?.length ?? 0;
  if (lenA !== lenB) return false;
  if (!lenA) return true;
  for (let i = 0; i < Math.min(5, lenA); i++) {
    if ((a.members![i]?.id ?? "") !== (b.members![i]?.id ?? "")) return false;
  }
  return true;
});

export default function BoardContent({ boardId, initialLists, archivedCards = [] }: { boardId: string; initialLists: ListItem[]; archivedCards?: CardItem[] }) {
  const [lists, setLists] = React.useState<ListItem[]>(initialLists);
  const [archives, setArchives] = React.useState<CardItem[]>(archivedCards);
  const [openedCardId, setOpenedCardId] = React.useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    const id = searchParams.get("openCard");
    if (!id) return;
    setOpenedCardId(id);
    const controller = new AbortController();
    fetch(`/api/cards/${id}?summary=1`, { signal: controller.signal }).catch((err) => {
      if ((err as any)?.name !== "AbortError") {
      }
    });
    return () => controller.abort();
  }, [searchParams]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function findListByCardId(cardId: string): { listIndex: number; cardIndex: number } | null {
    for (let i = 0; i < lists.length; i++) {
      const idx = lists[i].cards.findIndex((c) => c.id === cardId);
      if (idx >= 0) return { listIndex: i, cardIndex: idx };
    }
    return null;
  }

  function addCardToList(listId: string, card: { id: string; title: string; order: number }) {
    setLists((curr) => {
      const idx = curr.findIndex((l) => l.id === listId);
      if (idx === -1) return curr;
      const next = [...curr];
      const list = next[idx];
      next[idx] = { ...list, cards: [...list.cards, { id: card.id, title: card.title, order: card.order }] };
      return next;
    });
  }

  function addOptimisticCard(listId: string, card: { id: string; title: string; order: number }) {
    setLists((curr) => {
      const idx = curr.findIndex((l) => l.id === listId);
      if (idx === -1) return curr;
      const next = [...curr];

      const list = next[idx];
      next[idx] = { ...list, cards: [...list.cards, { id: card.id, title: card.title, order: card.order }] };
      return next;
    });
  }

  function reconcileCardId(tempId: string, created: { id: string; title: string; order: number }) {
    setLists((curr) => {
      const next = curr.map((list) => {
        const ci = list.cards.findIndex((c) => c.id === tempId);
        if (ci === -1) return list;
        const cards = [...list.cards];
        cards[ci] = { id: created.id, title: created.title, order: created.order };
        return { ...list, cards };
      });
      return next;
    });
  }

  function removeCardById(cardId: string) {
    setLists((curr) => curr.map((list) => ({ ...list, cards: list.cards.filter((c) => c.id !== cardId) })));
  }

  function addList(newList: { id: string; title: string; order: number }) {
    setLists((curr) => [...curr, { id: newList.id, title: newList.title, order: newList.order, cards: [] }]);
  }

  // New: Optimistic list insertion and reconciliation
  function addOptimisticList(newList: { id: string; title: string; order: number }) {
    setLists((curr) => [...curr, { id: newList.id, title: newList.title, order: newList.order, cards: [] }]);
  }

  function reconcileListId(tempId: string, created: { id: string; title: string; order: number }) {
    setLists((curr) => {
      const idx = curr.findIndex((l) => l.id === tempId);
      if (idx === -1) return curr;
      const next = [...curr];
      next[idx] = { ...next[idx], id: created.id, title: created.title, order: created.order };
      return next;
    });
  }

  function removeListById(listId: string) {
    setLists((curr) => curr.filter((l) => l.id !== listId));
  }

  async function reorderLists(newOrder: ListItem[]) {
    setLists(newOrder);
    try {
      await fetch(`/api/boards/${boardId}/lists/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: newOrder.map((l, i) => l.id) }),
      });
    } catch (err) {
      console.error("Failed to persist list reordering", err);
    }
  }

  async function moveCard(cardId: string, fromListId: string, toListId: string, toIndex: number) {
    try {
      await fetch(`/api/cards/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, fromListId, toListId, toIndex }),
      });
    } catch (err) {
      console.error("Failed to persist card move", err);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Dragging lists
    const activeListIndex = lists.findIndex((l) => l.id === activeId);
    const overListIndexForLists = lists.findIndex((l) => l.id === overId);
    if (activeListIndex !== -1 && overListIndexForLists !== -1 && activeListIndex !== overListIndexForLists) {
      const newOrder = arrayMove(lists, activeListIndex, overListIndexForLists);
      reorderLists(newOrder);
      return;
    }

    let persistMove: { cardId: string; fromListId: string; toListId: string; toIndex: number } | null = null;

    setLists((curr) => {
      const findIn = (cardId: string): { listIndex: number; cardIndex: number } | null => {
        for (let i = 0; i < curr.length; i++) {
          const idx = curr[i].cards.findIndex((c) => c.id === cardId);
          if (idx >= 0) return { listIndex: i, cardIndex: idx };
        }
        return null;
      };

      const origin = findIn(activeId);
      const overAsCard = findIn(overId);
      const overListIndex = overAsCard ? overAsCard.listIndex : curr.findIndex((l) => l.id === overId);

      if (!origin) return curr;

      const fromListIndex = origin.listIndex;
      const fromCardIndex = origin.cardIndex;

      // same list reorder
      if (overAsCard && overAsCard.listIndex === fromListIndex) {
        const list = curr[fromListIndex];
        const reordered = arrayMove(list.cards, fromCardIndex, overAsCard.cardIndex);
        const next = [...curr];
        next[fromListIndex] = { ...list, cards: reordered };
        persistMove = { cardId: activeId, fromListId: list.id, toListId: list.id, toIndex: overAsCard.cardIndex };
        return next;
      }

      // move to a specific card in another list
      if (overAsCard && overAsCard.listIndex !== fromListIndex) {
        const moving = curr[fromListIndex].cards[fromCardIndex];
        const next = [...curr];
        const fromCards = curr[fromListIndex].cards.filter((_, i) => i !== fromCardIndex);
        next[fromListIndex] = { ...curr[fromListIndex], cards: fromCards };
        const destIdx = overAsCard.listIndex;
        const toCardsBase = curr[destIdx].cards.filter((c) => c.id !== moving.id); // dedupe if already present
        const toCards = [...toCardsBase];
        toCards.splice(overAsCard.cardIndex, 0, moving);
        next[destIdx] = { ...curr[destIdx], cards: toCards };
        persistMove = { cardId: moving.id, fromListId: curr[fromListIndex].id, toListId: curr[destIdx].id, toIndex: overAsCard.cardIndex };
        return next;
      }

      // dropped in empty area of a list
      if (overListIndex !== -1) {
        const moving = curr[fromListIndex].cards[fromCardIndex];
        const next = [...curr];
        const fromCards = curr[fromListIndex].cards.filter((_, i) => i !== fromCardIndex);
        next[fromListIndex] = { ...curr[fromListIndex], cards: fromCards };
        const toCardsBase = curr[overListIndex].cards.filter((c) => c.id !== moving.id); // dedupe if already present
        const insertIndex = toCardsBase.length;
        const toCards = [...toCardsBase];
        toCards.splice(insertIndex, 0, moving);
        next[overListIndex] = { ...curr[overListIndex], cards: toCards };
        persistMove = { cardId: moving.id, fromListId: curr[fromListIndex].id, toListId: curr[overListIndex].id, toIndex: insertIndex };
        return next;
      }

      return curr;
    });

    if (persistMove !== null) {
      moveCard(persistMove.cardId, persistMove.fromListId, persistMove.toListId, persistMove.toIndex);
    }
  }

  async function patchCard(cardId: string, payload: Record<string, any>) {
    try {
      await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("Failed to patch card", err);
    }
  }

  function updateCardTitle(cardId: string, newTitle: string) {
    setLists((curr) => {
      const loc = findListByCardId(cardId);
      if (!loc) return curr;
      const next = [...curr];
      const list = next[loc.listIndex];
      const cards = [...list.cards];
      cards[loc.cardIndex] = { ...cards[loc.cardIndex], title: newTitle };
      next[loc.listIndex] = { ...list, cards };
      return next;
    });
    setArchives((curr) => curr.map((c) => (c.id === cardId ? { ...c, title: newTitle } : c)));
    patchCard(cardId, { title: newTitle });
  }

  // Reflect modal changes (due date, members, checklist count) in list view immediately
  function handleCardUpdated(patch: { id: string; title?: string; dueDate?: string | null; checklistCount?: number; assignmentCount?: number; members?: CardItem["members"] }) {
    const { id, title, dueDate, checklistCount, assignmentCount, members } = patch;
    setLists((curr) => {
      const loc = findListByCardId(id);
      if (!loc) return curr;
      const next = [...curr];
      const list = next[loc.listIndex];
      const cards = [...list.cards];
      const prev = cards[loc.cardIndex];
      cards[loc.cardIndex] = {
        ...prev,
        ...(title !== undefined ? { title } : {}),
        ...(dueDate !== undefined ? { dueDate } : {}),
        ...(checklistCount !== undefined ? { checklistCount } : {}),
        ...(assignmentCount !== undefined ? { assignmentCount } : {}),
        ...(members !== undefined ? { members } : {}),
      };
      next[loc.listIndex] = { ...list, cards };
      return next;
    });
    setArchives((curr) => curr.map((c) => (c.id === id ? {
      ...c,
      ...(title !== undefined ? { title } : {}),
      ...(dueDate !== undefined ? { dueDate } : {}),
      ...(checklistCount !== undefined ? { checklistCount } : {}),
      ...(assignmentCount !== undefined ? { assignmentCount } : {}),
      ...(members !== undefined ? { members } : {}),
    } : c)));
  }

  function toggleArchive(card: CardItem, checked: boolean) {
    if (checked) {
      // move from lists to archives
      setLists((curr) => {
        const loc = findListByCardId(card.id);
        if (!loc) return curr;
        const next = [...curr];
        const fromList = next[loc.listIndex];
        const moving = fromList.cards[loc.cardIndex];
        next[loc.listIndex] = { ...fromList, cards: fromList.cards.filter((_, i) => i !== loc.cardIndex) };
        // Deduplicate when adding to archives
        setArchives((a) => (a.some((x) => x.id === moving.id) ? a : [...a, { ...moving, listId: fromList.id }]));
        return next;
      });
      patchCard(card.id, { archived: true });
    } else {
      // move from archives back to original list
      setArchives((curr) => {
        const moving = curr.find((c) => c.id === card.id);
        const rest = curr.filter((c) => c.id !== card.id);
        if (moving?.listId) {
          setLists((l) => {
            const idx = l.findIndex((li) => li.id === moving.listId);
            if (idx === -1) return l;
            const next = [...l];
            next[idx] = { ...next[idx], cards: [...next[idx].cards, { id: moving.id, title: moving.title, order: next[idx].cards.length }] };
            return next;
          });
        }
        return rest;
      });
      patchCard(card.id, { archived: false });
    }
  }

  async function handleCloseModal() {
    const id = openedCardId;
    setOpenedCardId(null);
    // Clear openCard from URL without a full navigation
    try { router.replace(window.location.pathname); } catch {}
    if (!id) return;
    try {
      const res = await fetch(`/api/cards/${id}?summary=1`);
      if (res.ok) {
        const detail = await res.json();
        if (detail.archived) {
          // remove from lists and add to archives (dedupe)
          setLists((curr) => {
            const loc = findListByCardId(id);
            if (!loc) return curr;
            const next = [...curr];
            const from = next[loc.listIndex];
            const moving = from.cards[loc.cardIndex];
            next[loc.listIndex] = { ...from, cards: from.cards.filter((_, i) => i !== loc.cardIndex) };
            setArchives((a) => (a.some((x) => x.id === moving.id) ? a : [...a, { ...moving, listId: from.id }]));
            return next;
          });
        } else {
          // update title if changed via modal
          if (detail.title) updateCardTitle(id, detail.title);
        }
      }
    } catch (err) {
      // silently ignore
    }
  }

  return (
    <> 
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={lists.map((l) => l.id)} strategy={horizontalListSortingStrategy}>
          <div className="pt-10 px-6 h-[calc(100vh-40px)] overflow-x-auto overflow-y-hidden pb-8 flex items-start gap-2">
            {lists.length === 0 ? (
              <div className="rounded-lg border border-black/10 dark:border-white/15 p-6 w-72 shrink-0 bg-gray-100">
                <p className="text-sm">No lists yet.</p>
                <p className="text-xs text-foreground/70">Create a list to organize your cards.</p>
              </div>
            ) : (
              <>
                {lists.map((l) => (
                  <SortableListWrapper key={l.id} list={l}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold">{l.title}</p>
                    </div>
                    <SortableContext items={l.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                      <div className="mt-4 flex flex-col gap-2 pr-1 pb-4 flex-1 min-h-0 overflow-y-auto">
                        {l.cards.length === 0 ? (
                          <p className="text-xs text-foreground/60">No cards</p>
                        ) : (
                          l.cards.map((c) => <SortableCard key={c.id} card={c} onOpen={setOpenedCardId} onToggleArchive={toggleArchive} onUpdateTitle={updateCardTitle} />)
                        )}
                      </div>
                    </SortableContext>
                    <CreateCard
                      listId={l.id}
                      onOptimisticCreate={(card) => addOptimisticCard(l.id, card)}
                      onFinalize={(prevId, created) => reconcileCardId(prevId, created)}
                      onRollback={(prevId) => removeCardById(prevId)}
                    />
                  </SortableListWrapper>
                ))}
                <AddListTile
                  boardId={boardId}
                  onOptimisticCreate={(list) => addOptimisticList(list)}
                  onFinalize={(prevId, created) => reconcileListId(prevId, created)}
                  onRollback={(prevId) => removeListById(prevId)}
                />
                {/* Archives list */}
                <div className="w-72 shrink-0 self-start rounded-lg border border-black/10 dark:border-white/15 bg-gray-100 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">Archives</p>
                  </div>
                  <div className="mt-4 flex flex-col gap-2 max-h-[calc(100vh-160px)] overflow-y-auto pr-1 pb-4">
                    {archives.length === 0 ? (
                      <p className="text-xs text-foreground/60">No archived cards</p>
                    ) : (
                      <>
                        {archives.map((c) => (
                          <div key={c.id} className="rounded border border-black/10 dark:border-white/15 bg-foreground/5 p-3">
                            <div className="flex items-center gap-2">
                              <input type="checkbox" checked onChange={(e) => toggleArchive(c, e.target.checked)} />
                              <span className="text-sm">{c.title}</span>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </SortableContext>
      </DndContext>
      {openedCardId && <CardModal cardId={openedCardId} onClose={handleCloseModal} onCardUpdated={handleCardUpdated} />}
    </>
  );
}