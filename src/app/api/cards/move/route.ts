import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cardId: string = body?.cardId;
    const fromListId: string = body?.fromListId;
    const toListId: string = body?.toListId;
    let toIndex: number = Number(body?.toIndex ?? 0);
    if (!cardId || !fromListId || !toListId) {
      return NextResponse.json({ error: "cardId, fromListId, toListId required" }, { status: 400 });
    }

    const card = await prisma.card.findUnique({ where: { id: cardId }, select: { order: true, listId: true, boardId: true } });
    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });

    const isSameList = fromListId === toListId;

    // Clamp destination index
    const destCount = await prisma.card.count({ where: { listId: toListId, archived: false } });
    if (isSameList) {
      // moving within same list removes one from count
      toIndex = Math.max(0, Math.min(destCount - 1, toIndex));
    } else {
      toIndex = Math.max(0, Math.min(destCount, toIndex));
    }

    await prisma.$transaction(async (tx) => {
      if (isSameList) {
        const currentOrder = card.order;
        if (toIndex === currentOrder) return;
        if (toIndex > currentOrder) {
          // shift down items between current+1..toIndex
          await tx.card.updateMany({
            where: { listId: fromListId, archived: false, order: { gt: currentOrder, lte: toIndex } },
            data: { order: { decrement: 1 } },
          });
        } else {
          // shift up items between toIndex..current-1
          await tx.card.updateMany({
            where: { listId: fromListId, archived: false, order: { gte: toIndex, lt: currentOrder } },
            data: { order: { increment: 1 } },
          });
        }
        await tx.card.update({ where: { id: cardId }, data: { order: toIndex } });
      } else {
        // remove from source list: close the gap
        await tx.card.updateMany({
          where: { listId: fromListId, archived: false, order: { gt: card.order } },
          data: { order: { decrement: 1 } },
        });
        // make room in dest list
        await tx.card.updateMany({
          where: { listId: toListId, archived: false, order: { gte: toIndex } },
          data: { order: { increment: 1 } },
        });
        
        // Fetch destination list defaults
        const toList = await tx.list.findUnique({
          where: { id: toListId },
          select: { defaultDueDays: true, defaultMemberIds: true, defaultChecklist: true }
        });

        const updateData: any = { listId: toListId, order: toIndex };
        if (toList && typeof toList.defaultDueDays === 'number') {
          const d = new Date();
          d.setDate(d.getDate() + toList.defaultDueDays);
          updateData.dueDate = d;
        }

        // move card
        await tx.card.update({ where: { id: cardId }, data: updateData });

        // Apply defaults
        if (toList) {
          if (toList.defaultMemberIds?.length) {
            await tx.cardAssignment.createMany({
              data: toList.defaultMemberIds.map(uid => ({ cardId, userId: uid })),
              skipDuplicates: true
            });
          }
          if (toList.defaultChecklist) {
            const items = toList.defaultChecklist as any[];
            if (Array.isArray(items) && items.length > 0) {
              const checklist = await tx.checklist.create({
                data: { title: "Checklist", cardId }
              });
              await tx.checklistItem.createMany({
                data: items.map(i => ({ checklistId: checklist.id, title: i.title, completed: !!i.completed }))
              });
            }
          }
        }
      }
    });

    // Invalidate cached board page for this card's board
    try {
      if (card.boardId) revalidateTag(`board:${card.boardId}`);
    } catch {}
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/cards/move error", err);
    return NextResponse.json({ error: "Failed to move card" }, { status: 500 });
  }
}