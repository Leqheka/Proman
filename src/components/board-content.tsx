"use client";

import React from "react";
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import CreateCard from "./create-card";
import AddListTile from "./add-list-tile";

export type CardItem = { id: string; title: string; order: number };
export type ListItem = { id: string; title: string; order: number; cards: CardItem[] };

function SortableListWrapper({ list, children }: { list: ListItem; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: list.id });
  const style = { transform: CSS.Transform.toString(transform), transition } as React.CSSProperties;
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="w-72 shrink-0 self-start rounded-lg border border-black/10 dark:border-white/15 bg-gray-100 p-3">
      {children}
    </div>
  );
}

function SortableCard({ card }: { card: CardItem }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: card.id });
  const style = { transform: CSS.Transform.toString(transform), transition } as React.CSSProperties;
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="rounded border border-black/10 dark:border-white/15 bg-foreground/5 p-3 hover:bg-foreground/10 hover:shadow-sm transition-colors">
      <p className="text-sm">{card.title}</p>
    </div>
  );
}

export default function BoardContent({ boardId, initialLists }: { boardId: string; initialLists: ListItem[] }) {
  const [lists, setLists] = React.useState<ListItem[]>(initialLists);

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

    // Dragging cards
    const origin = findListByCardId(activeId);
    const overAsCard = findListByCardId(overId);
    const overListIndex = overAsCard ? overAsCard.listIndex : lists.findIndex((l) => l.id === overId);

    if (origin) {
      const fromListIndex = origin.listIndex;
      const fromCardIndex = origin.cardIndex;

      // same list reorder
      if (overAsCard && overAsCard.listIndex === fromListIndex) {
        const list = lists[fromListIndex];
        const reordered = arrayMove(list.cards, fromCardIndex, overAsCard.cardIndex);
        const next = [...lists];
        next[fromListIndex] = { ...list, cards: reordered };
        setLists(next);
        moveCard(activeId, list.id, list.id, overAsCard.cardIndex);
        return;
      }

      // move to a specific card in another list
      if (overAsCard && overAsCard.listIndex !== fromListIndex) {
        const moving = lists[fromListIndex].cards[fromCardIndex];
        const next = [...lists];
        const fromCards = [...lists[fromListIndex].cards];
        fromCards.splice(fromCardIndex, 1);
        next[fromListIndex] = { ...lists[fromListIndex], cards: fromCards };
        const toCards = [...lists[overAsCard.listIndex].cards];
        toCards.splice(overAsCard.cardIndex, 0, moving);
        next[overAsCard.listIndex] = { ...lists[overAsCard.listIndex], cards: toCards };
        setLists(next);
        moveCard(moving.id, lists[fromListIndex].id, lists[overAsCard.listIndex].id, overAsCard.cardIndex);
        return;
      }

      // dropped in empty area of a list
      if (overListIndex !== -1) {
        const moving = lists[fromListIndex].cards[fromCardIndex];
        const next = [...lists];
        const fromCards = [...lists[fromListIndex].cards];
        fromCards.splice(fromCardIndex, 1);
        next[fromListIndex] = { ...lists[fromListIndex], cards: fromCards };
        const toCards = [...lists[overListIndex].cards];
        const insertIndex = toCards.length;
        toCards.splice(insertIndex, 0, moving);
        next[overListIndex] = { ...lists[overListIndex], cards: toCards };
        setLists(next);
        moveCard(moving.id, lists[fromListIndex].id, lists[overListIndex].id, insertIndex);
      }
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={lists.map((l) => l.id)} strategy={horizontalListSortingStrategy}>
        <div className="pt-10 px-6 h-[calc(100vh-96px)] overflow-x-auto pb-1 flex items-start gap-4">
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
                    <div className="mt-3 flex flex-col gap-2 max-h-[calc(100vh-160px)] overflow-y-auto pr-1">
                      {l.cards.length === 0 ? (
                        <p className="text-xs text-foreground/60">No cards</p>
                      ) : (
                        l.cards.map((c) => <SortableCard key={c.id} card={c} />)
                      )}
                    </div>
                  </SortableContext>
                  <CreateCard listId={l.id} />
                </SortableListWrapper>
              ))}
              <AddListTile boardId={boardId} />
            </>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
}