"use client";

import React from "react";
// import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { DndContext, closestCenter, DragEndEvent, DragStartEvent, DragOverEvent, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import CreateCard from "./create-card";
import AddListTile from "./add-list-tile";
import Avatar from "./avatar";
import ListSettingsModal from "./list-settings-modal";
import CardModal from "./card-modal";

export type CardItem = { id: string; title: string; order: number; listId?: string; dueDate?: string | null; hasDescription?: boolean; checklistCount?: number; commentCount?: number; attachmentCount?: number; assignmentCount?: number; members?: Array<{ id: string; name: string | null; email: string; image: string | null }> };
export type ListItem = { 
  id: string; 
  title: string; 
  order: number; 
  cards: CardItem[];
  defaultDueDays?: number | null;
  defaultMemberIds?: string[];
  defaultChecklist?: any;
};

function SortableListWrapperBase({ list, children }: { list: ListItem; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: list.id });
  const style = { transform: CSS.Transform.toString(transform), transition } as React.CSSProperties;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="w-72 shrink-0 self-start mt-2 mb-4 rounded-lg border border-black/10 dark:border-neutral-800 bg-background/60 dark:bg-neutral-900/60 text-foreground shadow-sm max-h-full flex flex-col p-2"
    >
      {children}
    </div>
  );
}

const SortableListWrapper = React.memo(SortableListWrapperBase);

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

function Card({ card, onOpen, onToggleArchive, onUpdateTitle, style, dragHandleProps }: { card: CardItem; onOpen: (id: string) => void; onToggleArchive: (card: CardItem, checked: boolean) => void; onUpdateTitle: (cardId: string, newTitle: string) => void; style?: React.CSSProperties; dragHandleProps?: any }) {
  const prefetched = React.useRef(false);
  const dueStatus = getDueStatus(card.dueDate);
  const dueClasses =
    dueStatus === "overdue"
      ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
      : dueStatus === "today"
      ? "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800"
      : dueStatus === "soon"
      ? "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800"
      : "bg-transparent border border-neutral-200 dark:border-neutral-800";
  return (
    <div
      style={style}
      {...dragHandleProps}
      onMouseEnter={() => {
        if (prefetched.current) return;
        if (isTempCardId(card.id)) return;
        prefetched.current = true;
        fetch(`/api/cards/${card.id}?summary=1`).catch(() => {});
        import("./card-modal").catch(() => {});
      }}
      onClick={() => {
        if (isTempCardId(card.id)) return;
        onOpen(card.id);
      }}
      className="group relative rounded-lg border border-black/10 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-black text-neutral-900 dark:text-neutral-100 p-3 hover:shadow-sm transition-colors cursor-pointer"
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
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-neutral-500">
          {card.dueDate && (
            <span className={`inline-flex items-center gap-1 px-2 py-[2px] rounded ${dueClasses}`}>
              <span
                className="w-[18px] h-[18px] inline-block"
                style={{
                  WebkitMaskImage: 'url(/icons/New/due_date.svg)',
                  maskImage: 'url(/icons/New/due_date.svg)',
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
                className="w-[18px] h-[18px] inline-block"
                style={{
                  WebkitMaskImage: 'url(/icons/New/description.svg)',
                  maskImage: 'url(/icons/New/description.svg)',
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
                className="w-[18px] h-[18px] inline-block"
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
              <span>{card.checklistCount}</span>
            </span>
          )}
          {(card.commentCount ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1">
              <span
                className="w-[18px] h-[18px] inline-block"
                style={{
                  WebkitMaskImage: 'url(/icons/New/comment.svg)',
                  maskImage: 'url(/icons/New/comment.svg)',
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
                className="w-[18px] h-[18px] inline-block"
                style={{
                  WebkitMaskImage: 'url(/icons/New/attachments.svg)',
                  maskImage: 'url(/icons/New/attachments.svg)',
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
                <Avatar key={m.id} name={m.name || undefined} email={m.email} image={m.image || undefined} size={22} />
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

function SortableCardBase({ card, onOpen, onToggleArchive, onUpdateTitle }: { card: CardItem; onOpen: (id: string) => void; onToggleArchive: (card: CardItem, checked: boolean) => void; onUpdateTitle: (cardId: string, newTitle: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const style = { 
    transform: CSS.Transform.toString(transform), 
    transition,
    opacity: isDragging ? 0 : 1, 
  } as React.CSSProperties;
  
  return (
    <div ref={setNodeRef} style={style}>
       <Card 
         card={card} 
         onOpen={onOpen} 
         onToggleArchive={onToggleArchive} 
         onUpdateTitle={onUpdateTitle}
         dragHandleProps={{...attributes, ...listeners}}
       />
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
  const [editingDefaultsListId, setEditingDefaultsListId] = React.useState<string | null>(null);
  const [editingListId, setEditingListId] = React.useState<string | null>(null);
  const [listPaging, setListPaging] = React.useState<Record<string, { hasMore: boolean; cursor: string | null; loading: boolean; total: number }>>(() => {
    const take = 100;
    const init: Record<string, { hasMore: boolean; cursor: string | null; loading: boolean; total: number }> = {};
    for (const l of initialLists) {
      const total = (l as any).totalCardCount ?? (l.cards?.length ?? 0);
      const hasMore = (l.cards?.length ?? 0) < total;
      const cursor = l.cards?.length ? l.cards[l.cards.length - 1].id : null;
      init[l.id] = { hasMore, cursor, loading: false, total };
    }
    return init;
  });
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeCard, setActiveCard] = React.useState<CardItem | null>(null);
  const [dragOriginListId, setDragOriginListId] = React.useState<string | null>(null);

  // Fix for stale closure in drag handlers
  const listsRef = React.useRef(lists);
  React.useEffect(() => {
    listsRef.current = lists;
  }, [lists]);

  React.useEffect(() => {
    const id = searchParams.get("openCard");
    if (!id) return;
    setOpenedCardId(id);
    const controller = new AbortController();
    // Preload modal chunk and warm API summary
    import("./card-modal").catch(() => {});
    fetch(`/api/cards/${id}?summary=1`, { signal: controller.signal }).catch((err) => {
      if ((err as any)?.name !== "AbortError") {
      }
    });
    return () => controller.abort();
  }, [searchParams]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function findListByCardId(cardId: string, searchLists: ListItem[] = lists): { listIndex: number; cardIndex: number } | null {
    for (let i = 0; i < searchLists.length; i++) {
      const idx = searchLists[i].cards.findIndex((c) => c.id === cardId);
      if (idx >= 0) return { listIndex: i, cardIndex: idx };
    }
    return null;
  }

  function addCardToList(listId: string, card: CardItem) {
    setLists((curr) => {
      const idx = curr.findIndex((l) => l.id === listId);
      if (idx === -1) return curr;
      const next = [...curr];
      const list = next[idx];
      const cardWithDesc = { ...card, hasDescription: !!(card as any).description || card.hasDescription };
      next[idx] = { ...list, cards: [...list.cards, cardWithDesc] };
      return next;
    });
    setListPaging((curr) => ({
      ...curr,
      [listId]: { ...(curr[listId] || { hasMore: false, cursor: null, loading: false, total: 0 }), cursor: card.id, total: (curr[listId]?.total ?? 0) + 1, hasMore: (curr[listId]?.total ?? 0) + 1 > (lists.find((l) => l.id === listId)?.cards.length ?? 0) + 1 },
    }));
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
    setListPaging((curr) => ({
      ...curr,
      [listId]: { ...(curr[listId] || { hasMore: false, cursor: null, loading: false, total: 0 }), cursor: card.id, total: (curr[listId]?.total ?? 0) + 1, hasMore: (curr[listId]?.total ?? 0) + 1 > (lists.find((l) => l.id === listId)?.cards.length ?? 0) + 1 },
    }));
  }

  function reconcileCardId(tempId: string, created: CardItem) {
    setLists((curr) => {
      const next = curr.map((list) => {
        const ci = list.cards.findIndex((c) => c.id === tempId);
        if (ci === -1) return list;
        const cards = [...list.cards];
        cards[ci] = { ...created, hasDescription: !!(created as any).description || created.hasDescription };
        return { ...list, cards };
      });
      return next;
    });
    // Update cursor for the list that contains the temp card
    setListPaging((curr) => {
      const loc = findListByCardId(tempId);
      if (!loc) return curr;
      const listId = lists[loc.listIndex].id;
      return { ...curr, [listId]: { ...(curr[listId] || { hasMore: false, cursor: null, loading: false, total: 0 }), cursor: created.id } };
    });
  }

  function removeCardById(cardId: string) {
    setLists((curr) => curr.map((list) => ({ ...list, cards: list.cards.filter((c) => c.id !== cardId) })));
  }

  async function loadMoreCards(listId: string) {
    const page = listPaging[listId];
    if (!page?.hasMore || page.loading) return;
    const cursor = page.cursor;
    try {
      setListPaging((curr) => ({ ...curr, [listId]: { ...(curr[listId] || { hasMore: false, cursor: null, loading: false, total: 0 }), loading: true } }));
      const params = new URLSearchParams();
      params.set("take", String(50));
      if (cursor) params.set("cursor", cursor);
      const resp = await fetch(`/api/lists/${listId}/cards?${params.toString()}`);
      if (resp.ok) {
        const next: CardItem[] = await resp.json();
        setLists((curr) => {
          const idx = curr.findIndex((l) => l.id === listId);
          if (idx === -1) return curr;
          const list = curr[idx];
          const existingIds = new Set(list.cards.map((c) => c.id));
          const appended = next.filter((c) => !existingIds.has(c.id));
          const cards = [...list.cards, ...appended];
          const updated = [...curr];
          updated[idx] = { ...list, cards };
          return updated;
        });
        const take = 50;
        const newCursor = next.length ? next[next.length - 1].id : cursor;
        setListPaging((curr) => {
          const prev = curr[listId] || { total: 0 } as any;
          const list = lists.find((l) => l.id === listId);
          const currentLen = list ? list.cards.length + next.length : next.length;
          const stillHasMore = currentLen < (prev.total ?? currentLen);
          return { ...curr, [listId]: { ...prev, hasMore: stillHasMore, cursor: newCursor, loading: false } };
        });
      } else {
        setListPaging((curr) => ({ ...curr, [listId]: { ...(curr[listId] || { hasMore: false, cursor: null, loading: false, total: 0 }), loading: false } }));
      }
    } catch (err) {
      console.error("Failed to load more cards", err);
      setListPaging((curr) => ({ ...curr, [listId]: { ...(curr[listId] || { hasMore: false, cursor: null, loading: false, total: 0 }), loading: false } }));
    }
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
      const res = await fetch(`/api/cards/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, fromListId, toListId, toIndex }),
      });
      if (res.ok) {
        const data: any = await res.json().catch(() => null);
        if (data && data.id) {
          handleCardUpdated({
            id: data.id,
            dueDate: data.dueDate ?? null,
            hasDescription: !!(data.description && typeof data.description === "string" && data.description.trim().length > 0),
            checklistCount: typeof data.checklistCount === "number" ? data.checklistCount : undefined,
            assignmentCount: typeof data.assignmentCount === "number" ? data.assignmentCount : undefined,
            commentCount: typeof data.commentCount === "number" ? data.commentCount : undefined,
            attachmentCount: typeof data.attachmentCount === "number" ? data.attachmentCount : undefined,
            members: Array.isArray(data.members)
              ? data.members.map((m: any) => ({
                  id: String(m.id),
                  name: m.name ?? null,
                  email: m.email,
                  image: m.image ?? null,
                }))
              : undefined,
          });
        }
      }
    } catch (err) {
      console.error("Failed to persist card move", err);
    }
  }

  async function handleUpdateListTitle(listId: string, newTitle: string) {
    const title = newTitle.trim();
    if (!title) {
      setEditingListId(null);
      return;
    }
    setEditingListId(null);
    setLists((curr) => curr.map((l) => (l.id === listId ? { ...l, title } : l)));
    try {
      await fetch(`/api/lists/${listId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
    } catch (err) {
      console.error("Failed to update list title", err);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const activeId = String(active.id);
    const currentLists = listsRef.current;
    
    // Use ref to find location to avoid stale state
    const findInRef = (id: string) => {
        for (let i = 0; i < currentLists.length; i++) {
            const idx = currentLists[i].cards.findIndex((c) => c.id === id);
            if (idx >= 0) return { listIndex: i, cardIndex: idx };
        }
        return null;
    };

    const loc = findInRef(activeId);
    if (loc) {
      setActiveCard(currentLists[loc.listIndex].cards[loc.cardIndex]);
      setDragOriginListId(currentLists[loc.listIndex].id);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Find the containers
    const findContainer = (id: string) => {
      const currentLists = listsRef.current;
      // Is it a list?
      const listIdx = currentLists.findIndex((l) => l.id === id);
      if (listIdx !== -1) return currentLists[listIdx].id;
      // Is it a card?
      for (const list of currentLists) {
        if (list.cards.some(c => c.id === id)) return list.id;
      }
      return null;
    };

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    setLists((curr) => {
      const activeContainerIdx = curr.findIndex((l) => l.id === activeContainer);
      const overContainerIdx = curr.findIndex((l) => l.id === overContainer);
      
      if (activeContainerIdx === -1 || overContainerIdx === -1) return curr;

      const next = [...curr];
      const activeList = next[activeContainerIdx];
      const overList = next[overContainerIdx];
      
      // Remove from source
      const activeCardIdx = activeList.cards.findIndex((c) => c.id === activeId);
      if (activeCardIdx === -1) return curr;
      
      const movingCard = activeList.cards[activeCardIdx];
      const newActiveList = {
        ...activeList,
        cards: [...activeList.cards.slice(0, activeCardIdx), ...activeList.cards.slice(activeCardIdx + 1)],
      };
      
      // Add to target
      const overCardIdx = overList.cards.findIndex((c) => c.id === overId);
      let newIndex;
      
      if (overCardIdx >= 0) {
        // Dropped over a card
        const isBelowOverItem =
          over &&
          active.rect.current.translated &&
          active.rect.current.translated.top > over.rect.top + over.rect.height;
        const modifier = isBelowOverItem ? 1 : 0;
        newIndex = overCardIdx + modifier;
      } else {
        // Dropped over a list container
        newIndex = overList.cards.length + 1;
      }
      
      // Clamp index
      newIndex = Math.max(0, Math.min(newIndex, overList.cards.length + 1));

      const newOverList = {
        ...overList,
        cards: [
          ...overList.cards.slice(0, newIndex),
          movingCard,
          ...overList.cards.slice(newIndex, overList.cards.length),
        ],
      };

      next[activeContainerIdx] = newActiveList;
      next[overContainerIdx] = newOverList;

      return next;
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const originListId = dragOriginListId;
    
    setActiveCard(null);
    setDragOriginListId(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Dragging lists
    const currentLists = listsRef.current;
    const activeListIndex = currentLists.findIndex((l) => l.id === activeId);
    const overListIndexForLists = currentLists.findIndex((l) => l.id === overId);
    if (activeListIndex !== -1 && overListIndexForLists !== -1 && activeListIndex !== overListIndexForLists) {
      const newOrder = arrayMove(currentLists, activeListIndex, overListIndexForLists);
      reorderLists(newOrder);
      return;
    }

    // Calculate destination based on 'over' to avoid stale state issues
    let toListId: string | null = null;
    let toIndex = 0;

    const overList = currentLists.find(l => l.id === overId);
    if (overList) {
        toListId = overList.id;
        toIndex = overList.cards.length; 
    } else {
        let overCardList: ListItem | undefined;
        let overCardIndex = -1;
        for (const l of currentLists) {
            const idx = l.cards.findIndex(c => c.id === overId);
            if (idx !== -1) {
                overCardList = l;
                overCardIndex = idx;
                break;
            }
        }
        if (overCardList) {
            toListId = overCardList.id;
            const isBelowOverItem = over && active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height;
            const modifier = isBelowOverItem ? 1 : 0;
            toIndex = overCardIndex + modifier;
        }
    }

    if (!toListId || !originListId) return;

    // Update local state immediately for same-list reordering (which handleDragOver skips)
    // and ensure cross-list moves are finalized.
    setLists((curr) => {
      const activeListIndex = curr.findIndex(l => l.cards.some(c => c.id === activeId));
      const destListIndex = curr.findIndex(l => l.id === toListId);
      
      if (activeListIndex === -1 || destListIndex === -1) return curr;
      
      const next = [...curr];
      const sourceList = next[activeListIndex];
      const destList = next[destListIndex];
      
      const sourceCardIndex = sourceList.cards.findIndex(c => c.id === activeId);
      if (sourceCardIndex === -1) return curr;

      // Same list reorder
      if (activeListIndex === destListIndex) {
         const overCardIndex = sourceList.cards.findIndex(c => c.id === overId);
         if (overCardIndex >= 0) {
            const newCards = arrayMove(sourceList.cards, sourceCardIndex, overCardIndex);
            next[activeListIndex] = { ...sourceList, cards: newCards };
            return next;
         }
         return curr;
      }
      
      // Cross-list move
      // If handleDragOver ran, the card might already be in the destination list in `curr`.
      // But if we are here, we found it in `activeListIndex`.
      // If `activeListIndex` != `destListIndex`, it means it's still in the old list (or `curr` is stale? No, curr is fresh).
      // So we move it.
      const newSourceCards = [...sourceList.cards];
      const [moved] = newSourceCards.splice(sourceCardIndex, 1);
      next[activeListIndex] = { ...sourceList, cards: newSourceCards };
      
      const newDestCards = [...destList.cards];
      newDestCards.splice(toIndex, 0, { ...moved, listId: toListId });
      next[destListIndex] = { ...destList, cards: newDestCards };
      
      return next;
    });

    moveCard(activeId, originListId, toListId, toIndex);
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
      const loc = findListByCardId(cardId, curr);
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
  function handleCardUpdated(patch: {
    id: string;
    title?: string;
    dueDate?: string | null;
    hasDescription?: boolean;
    checklistCount?: number;
    assignmentCount?: number;
    commentCount?: number;
    attachmentCount?: number;
    members?: Array<{ id: string; name?: string | null; email: string; image?: string | null }>;
  }) {
    const { id, title, dueDate, hasDescription, checklistCount, assignmentCount, commentCount, attachmentCount, members } = patch;
    setLists((curr) => {
      const loc = findListByCardId(id, curr);
      if (!loc) return curr;
      const next = [...curr];
      const list = next[loc.listIndex];
      const cards = [...list.cards];
      const prev = cards[loc.cardIndex];
      cards[loc.cardIndex] = {
        ...prev,
        ...(title !== undefined ? { title } : {}),
        ...(dueDate !== undefined ? { dueDate } : {}),
        ...(hasDescription !== undefined ? { hasDescription } : {}),
        ...(checklistCount !== undefined ? { checklistCount } : {}),
        ...(assignmentCount !== undefined ? { assignmentCount } : {}),
        ...(commentCount !== undefined ? { commentCount } : {}),
        ...(attachmentCount !== undefined ? { attachmentCount } : {}),
        ...(members !== undefined ? { members: members.map((m) => ({ ...m, name: m.name ?? null, image: m.image ?? null })) } : {}),
      };
      next[loc.listIndex] = { ...list, cards };
      return next;
    });
    setArchives((curr) =>
      curr.map((c) =>
        c.id === id
          ? {
              ...c,
              ...(title !== undefined ? { title } : {}),
              ...(dueDate !== undefined ? { dueDate } : {}),
              ...(hasDescription !== undefined ? { hasDescription } : {}),
              ...(checklistCount !== undefined ? { checklistCount } : {}),
              ...(assignmentCount !== undefined ? { assignmentCount } : {}),
              ...(commentCount !== undefined ? { commentCount } : {}),
              ...(attachmentCount !== undefined ? { attachmentCount } : {}),
              ...(members !== undefined
                ? { members: members.map((m) => ({ ...m, name: m.name ?? null, image: m.image ?? null })) }
                : {}),
            }
          : c
      )
    );
  }

  function toggleArchive(card: CardItem, checked: boolean) {
    if (checked) {
      // move from lists to archives
      setLists((curr) => {
        const loc = findListByCardId(card.id, curr);
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

  async function handleMoveCardFromModal(cardId: string, toListId: string) {
    const loc = findListByCardId(cardId);
    if (!loc) return;
    const fromListId = lists[loc.listIndex].id;
    if (fromListId === toListId) return;

    const toListIndex = lists.findIndex(l => l.id === toListId);
    if (toListIndex === -1) return;
    const toList = lists[toListIndex];
    const toIndex = toList.cards.length;

    // Optimistic Update
    setLists(curr => {
      const sLoc = findListByCardId(cardId, curr);
      if (!sLoc) return curr;
      const next = [...curr];
      const sList = next[sLoc.listIndex];
      const dListIdx = next.findIndex(l => l.id === toListId);
      if (dListIdx === -1) return curr;
      const dList = next[dListIdx];
      
      const newSourceCards = [...sList.cards];
      const [moved] = newSourceCards.splice(sLoc.cardIndex, 1);
      next[sLoc.listIndex] = { ...sList, cards: newSourceCards };

      const newDestCards = [...dList.cards, { ...moved, listId: toListId }];
      next[dListIdx] = { ...dList, cards: newDestCards };
      
      return next;
    });

    await moveCard(cardId, fromListId, toListId, toIndex);
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
            const loc = findListByCardId(id, curr);
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

  function ListCardsVirtualized({ cards, onOpen, onToggleArchive, onUpdateTitle, onNearEnd }: { cards: CardItem[]; onOpen: (id: string) => void; onToggleArchive: (card: CardItem, checked: boolean) => void; onUpdateTitle: (cardId: string, newTitle: string) => void; onNearEnd?: () => void }) {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [scrollTop, setScrollTop] = React.useState(0);
    const [containerHeight, setContainerHeight] = React.useState(0);
    const ITEM_HEIGHT = 72; // approximate card height
    const BUFFER = 5;

    React.useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      setContainerHeight(el.clientHeight);
      const onScroll = () => setScrollTop(el.scrollTop);
      el.addEventListener("scroll", onScroll);
      const onResize = () => setContainerHeight(el.clientHeight);
      window.addEventListener("resize", onResize);
      return () => {
        el.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onResize);
      };
    }, []);

    if (cards.length === 0) {
      return <div className="mt-4 pr-1 pb-4 flex-1 min-h-0 overflow-y-auto"><p className="text-xs text-foreground/60">No cards</p></div>;
    }

    // Only virtualize for large lists to avoid complexity for small ones
    if (cards.length < 50) {
      return (
        <div ref={containerRef} className="mt-4 flex flex-col gap-2 pr-1 pb-4 flex-1 min-h-0 overflow-y-auto">
          {cards.map((c) => (
            <SortableCard key={c.id} card={c} onOpen={onOpen} onToggleArchive={onToggleArchive} onUpdateTitle={onUpdateTitle} />
          ))}
        </div>
      );
    }

    const visibleCount = Math.ceil((containerHeight || 400) / ITEM_HEIGHT) + BUFFER * 2;
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER);
    const endIndex = Math.min(cards.length, startIndex + visibleCount);
    const topSpacer = startIndex * ITEM_HEIGHT;
    const bottomSpacer = (cards.length - endIndex) * ITEM_HEIGHT;

    // Trigger near-end callback to preload next page when approaching bottom
    React.useEffect(() => {
      if (!onNearEnd) return;
      const NEAR_END_BUFFER = Math.max(BUFFER, 3);
      if (endIndex >= cards.length - NEAR_END_BUFFER) {
        onNearEnd();
      }
    }, [endIndex, cards.length, onNearEnd]);

    return (
      <div ref={containerRef} className="mt-4 flex flex-col pr-1 pb-4 flex-1 min-h-0 overflow-y-auto">
        <div style={{ height: topSpacer }} />
        <div className="flex flex-col gap-2">
          {cards.slice(startIndex, endIndex).map((c) => (
            <SortableCard key={c.id} card={c} onOpen={onOpen} onToggleArchive={onToggleArchive} onUpdateTitle={onUpdateTitle} />
          ))}
        </div>
        <div style={{ height: bottomSpacer }} />
      </div>
    );
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveCard(null)}>
        <SortableContext items={lists.map((l) => l.id)} strategy={horizontalListSortingStrategy}>
          <div className="pt-16 h-[calc(100vh-40px)] overflow-x-auto overflow-y-hidden pb-8">
            <div className="mx-auto w-full px-8 flex items-start gap-3">
              {lists.length === 0 ? (
                <AddListTile
                  boardId={boardId}
                  onOptimisticCreate={(list) => addOptimisticList(list)}
                  onFinalize={(prevId, created) => reconcileListId(prevId, created)}
                  onRollback={(prevId) => removeListById(prevId)}
                />
              ) : (
                <>
                  {lists.map((l) => (
                    <SortableListWrapper key={l.id} list={l}>
                    <div className="group/header flex items-center justify-between relative min-h-[24px] mb-2">
                      {editingListId === l.id ? (
                        <input
                          autoFocus
                          className="w-full text-sm font-bold bg-transparent border border-primary rounded px-1"
                          defaultValue={l.title}
                          onPointerDown={(e) => e.stopPropagation()}
                          onBlur={(e) => handleUpdateListTitle(l.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdateListTitle(l.id, e.currentTarget.value);
                            if (e.key === "Escape") setEditingListId(null);
                          }}
                        />
                      ) : (
                        <p 
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); setEditingListId(l.id); }}
                          className="text-sm font-bold cursor-pointer hover:bg-foreground/5 px-1 rounded flex-1 truncate"
                        >
                          {l.title}
                        </p>
                      )}
                      <div className="flex items-center">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingDefaultsListId(l.id); }}
                          className="p-1 hover:bg-foreground/10 rounded transition-opacity"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="19" cy="12" r="1" />
                            <circle cx="5" cy="12" r="1" />
                          </svg>
                        </button>
                      </div>
                    </div>
                <SortableContext items={l.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  <ListCardsVirtualized cards={l.cards} onOpen={setOpenedCardId} onToggleArchive={toggleArchive} onUpdateTitle={updateCardTitle} onNearEnd={() => {
                    const p = listPaging[l.id];
                    if (p && p.hasMore && !p.loading) loadMoreCards(l.id);
                  }} />
                </SortableContext>
                {listPaging[l.id]?.hasMore && (
                  <div className="mt-2 flex justify-center">
                    <button
                      onClick={() => loadMoreCards(l.id)}
                      disabled={!!listPaging[l.id]?.loading}
                      className={`text-xs rounded px-3 py-1 ${listPaging[l.id]?.loading ? "bg-foreground/10" : "bg-foreground text-background"}`}
                    >
                      {listPaging[l.id]?.loading ? "Loading..." : "Load more cards"}
                    </button>
                  </div>
                )}
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
                </>
              )}
            </div>
          </div>
        </SortableContext>
        <DragOverlay>
          {activeCard ? (
            <div className="opacity-80 rotate-2 cursor-grabbing">
              <SortableCard 
                card={activeCard} 
                onOpen={() => {}} 
                onToggleArchive={() => {}} 
                onUpdateTitle={() => {}} 
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {openedCardId && (
        <CardModal
          cardId={openedCardId}
          onClose={handleCloseModal}
          onCardUpdated={handleCardUpdated}
          availableLists={lists.map(l => ({ id: l.id, title: l.title }))}
          onMoveCard={(toListId) => handleMoveCardFromModal(openedCardId, toListId)}
          initial={(() => {
            const loc = findListByCardId(openedCardId!);
            if (!loc) return null;
            const list = lists[loc.listIndex];
            const c = list.cards[loc.cardIndex];
            return {
              id: c.id,
              title: c.title,
              description: "",
              dueDate: c.dueDate ?? null,
              list: { id: list.id, title: list.title, boardId },
              board: { id: boardId, title: "" },
              labels: [],
              attachments: [],
              comments: [],
              checklists: [],
              members: (c.members ?? []).map((m) => ({ id: m.id, name: m.name ?? null, email: m.email, image: m.image ?? null })),
              checklistCount: c.checklistCount ?? 0,
              commentCount: c.commentCount ?? 0,
              attachmentCount: c.attachmentCount ?? 0,
              assignmentCount: c.assignmentCount ?? 0,
            } as any;
          })()}
        />
      )}
      {editingDefaultsListId && (() => {
        const list = lists.find(l => l.id === editingDefaultsListId);
        if (!list) return null;
        
        // Normalize legacy checklist format to new multi-checklist format
        let initialChecklists: any[] | undefined = undefined;
        const rawChecklist = list.defaultChecklist as any;
        
        if (Array.isArray(rawChecklist) && rawChecklist.length > 0) {
          const isNewFormat = rawChecklist.some(item => 'items' in item && Array.isArray(item.items));
          if (isNewFormat) {
            initialChecklists = rawChecklist;
          } else {
            // Convert old format (array of items) to single checklist
            initialChecklists = [{ title: "Checklist", items: rawChecklist }];
          }
        }

        return (
          <ListSettingsModal
            listId={list.id}
            boardId={boardId}
            initialDefaults={{
              dueDays: list.defaultDueDays,
              memberIds: list.defaultMemberIds,
              checklists: initialChecklists,
            }}
            onClose={() => setEditingDefaultsListId(null)}
            onSave={(defaults) => {
              setLists(curr => curr.map(l => l.id === list.id ? {
                ...l,
                defaultDueDays: defaults.dueDays,
                defaultMemberIds: defaults.memberIds,
                defaultChecklist: defaults.checklists,
              } : l));
            }}
          />
        );
      })()}
    </>
  );
}
