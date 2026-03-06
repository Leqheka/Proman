import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const tomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const endOfTomorrow = new Date(endOfToday.getTime() + 24 * 60 * 60 * 1000);

    // Find cards with due dates, not archived, and from non-archived boards
    const cards = await prisma.card.findMany({
      where: {
        archived: false,
        dueDate: { not: null },
        board: {
          isArchived: false,
        },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        boardId: true,
        board: { select: { title: true } },
        assignments: { select: { userId: true } },
      },
    });

    let sentCount = 0;

    for (const card of cards) {
      if (!card.dueDate) continue;
      const due = new Date(card.dueDate);
      
      let state: "soon" | "today" | "overdue" | null = null;

      if (due < startOfToday) {
        // Only notify overdue if it was RECENTLY overdue (e.g. yesterday) or just keep notifying?
        // Usually we notify once when it becomes overdue.
        // Let's just notify if it's overdue.
        // To avoid spamming everyday for an overdue card, we should check if we EVER sent an 'overdue' notification for this card?
        // Or maybe just if we sent one in the last 24 hours.
        state = "overdue";
      } else if (due >= startOfToday && due <= endOfToday) {
        state = "today";
      } else if (due > endOfToday && due <= endOfTomorrow) {
        state = "soon";
      }

      if (!state) continue;

      // Check assigned users
      for (const assignment of card.assignments) {
        // Check if we already sent a notification for this state to this user for this card RECENTLY (last 20h)
        const existing = await prisma.notification.findMany({
            where: {
                userId: assignment.userId,
                type: "CARD_DUE",
                createdAt: { gt: new Date(Date.now() - 20 * 60 * 60 * 1000) },
            }
        });
        
        const alreadySent = existing.some(n => (n.data as any).cardId === card.id && (n.data as any).state === state);
        
        if (alreadySent) continue;

        await prisma.notification.create({
            data: {
                userId: assignment.userId,
                type: "CARD_DUE",
                data: {
                    cardId: card.id,
                    cardTitle: card.title,
                    boardId: card.boardId,
                    boardTitle: card.board.title,
                    state,
                    dueDate: card.dueDate
                }
            }
        });
        sentCount++;
      }
    }

    return NextResponse.json({ success: true, sent: sentCount });
  } catch (error) {
    console.error("Cron job failed", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
