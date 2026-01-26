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
      // Lock the card to prevent race conditions during rapid moves
      await tx.$executeRaw`SELECT 1 FROM "Card" WHERE id = ${cardId} FOR UPDATE`;

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
          select: { defaultDueDays: true, defaultMemberIds: true, defaultChecklist: true },
        });

        const updateData: any = { listId: toListId, order: toIndex };
        if (toList && typeof toList.defaultDueDays === "number") {
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
              data: toList.defaultMemberIds.map((uid) => ({ cardId, userId: uid })),
              skipDuplicates: true,
            });
          }
          if (toList.defaultChecklist) {
            // Check if card already has any checklist to avoid duplication
            // We use findFirst to see if a checklist exists.
            // Since we locked the Card row at the start of transaction, we should be safe from races on this card.
            const existingChecklist = await tx.checklist.findFirst({
              where: { cardId },
              select: { id: true },
            });

            if (!existingChecklist) {
              const rawItems = toList.defaultChecklist;
              if (Array.isArray(rawItems) && rawItems.length > 0) {
                // Filter out invalid items (empty titles, non-objects)
                const validItems = rawItems.filter((i: any) => 
                  i && 
                  typeof i === 'object' && 
                  typeof i.title === 'string' && 
                  i.title.trim().length > 0
                );
                
                if (validItems.length > 0) {
                  const checklist = await tx.checklist.create({
                    data: { title: "Checklist", cardId },
                  });
                  await tx.checklistItem.createMany({
                    data: validItems.map((i: any) => ({ 
                      checklistId: checklist.id, 
                      title: i.title, 
                      completed: !!i.completed 
                    })),
                  });
                }
              }
            }
          }
        }
      }
    });

    const fullCard = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        assignments: { include: { user: true } },
        checklists: { include: { items: true } },
        _count: {
          select: {
            comments: true,
            attachments: true,
          },
        },
      },
    });

    // Invalidate cached board page for this card's board
    try {
      if (card.boardId) revalidateTag(`board:${card.boardId}`);
    } catch {}

    if (fullCard) {
      const responseCard = {
        ...fullCard,
        checklistCount: fullCard.checklists.reduce((acc, c) => acc + c.items.length, 0),
        commentCount: fullCard._count.comments,
        attachmentCount: fullCard._count.attachments,
        assignmentCount: fullCard.assignments.length,
        members: fullCard.assignments.map(a => ({
          id: a.user.id,
          name: a.user.name,
          email: a.user.email,
          image: a.user.image,
        })),
      };
      return NextResponse.json(responseCard);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/cards/move error", err);
    return NextResponse.json({ error: "Failed to move card" }, { status: 500 });
  }
}
