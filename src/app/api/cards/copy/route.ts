import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
import { logActivity } from "@/lib/activity-log";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cardId, toListId, title } = body;

    if (!cardId || !toListId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value || "";
    const session = token ? await verifySession(token) : null;
    const userId = session?.sub as string;

    // Fetch source card
    const sourceCard = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        labels: true,
        attachments: true,
        checklists: {
          include: {
            items: true
          }
        },
        assignments: true,
      }
    });

    if (!sourceCard) {
      return NextResponse.json({ error: "Source card not found" }, { status: 404 });
    }

    // Get max order in destination list
    const lastCard = await prisma.card.findFirst({
      where: { listId: toListId },
      orderBy: { order: "desc" },
      select: { order: true }
    });
    const newOrder = (lastCard?.order ?? 0) + 1;

    // Create new card
    const newCard = await prisma.card.create({
      data: {
        title: title || sourceCard.title,
        description: sourceCard.description,
        listId: toListId,
        boardId: sourceCard.boardId, // Assuming copy within same board for now, or fetch list's board if cross-board
        order: newOrder,
        dueDate: sourceCard.dueDate,
        archived: false, // Always active
        
        // Copy Labels
        labels: {
          create: sourceCard.labels.map(l => ({
            labelId: l.labelId
          }))
        },

        // Copy Attachments
        attachments: {
          create: sourceCard.attachments.map(a => ({
            url: a.url,
            filename: a.filename,
            size: a.size,
            type: a.type
          }))
        },

        // Copy Checklists
        checklists: {
          create: sourceCard.checklists.map(c => ({
            title: c.title,
            items: {
              create: c.items.map(i => ({
                title: i.title,
                completed: i.completed, // Keep completion status? Usually yes for copy.
                dueDate: i.dueDate,
                order: i.order
              }))
            }
          }))
        },

        // Copy Assignments
        assignments: {
          create: sourceCard.assignments.map(a => ({
            userId: a.userId
          }))
        }
      }
    });

    if (userId) {
      await logActivity(
        newCard.id,
        newCard.boardId,
        userId,
        "CARD_CREATED",
        `copied this card from "${sourceCard.title}"`
      );
    }

    return NextResponse.json(newCard);

  } catch (err) {
    console.error("POST /api/cards/copy error", err);
    return NextResponse.json({ error: "Failed to copy card" }, { status: 500 });
  }
}
