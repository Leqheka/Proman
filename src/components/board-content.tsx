"use client";

import React from "react";
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import CreateCard from "./create-card";
import AddListTile from "./add-list-tile";
import CardModal from "./card-modal";

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

function SortableCard({ card, onOpen }: { card: CardItem; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: card.id });
  const style = { transform: CSS.Transform.toString(transform), transition } as React.CSSProperties;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(card.id)}
      className="rounded border border-black/10 dark:border-white/15 bg-foreground/5 p-3 hover:bg-foreground/10 hover:shadow-sm transition-colors cursor-pointer"
    >
      <p className="text-sm">{card.title}</p>
    </div>
  );
}

export default function BoardContent({ boardId, initialLists }: { boardId: string; initialLists: ListItem[] }) {
  const [lists, setLists] = React.useState<ListItem[]>(initialLists);
  const [openedCardId, setOpenedCardId] = React.useState<string | null>(null);

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

  return (
    <> 
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
                          l.cards.map((c) => <SortableCard key={c.id} card={c} onOpen={setOpenedCardId} />)
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
      {openedCardId && <CardModal cardId={openedCardId} onClose={() => setOpenedCardId(null)} />}
    </>
  );
}