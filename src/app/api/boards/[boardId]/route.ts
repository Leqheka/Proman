import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateTag, revalidatePath } from "next/cache";
import { verifySession } from "@/lib/session";

export async function GET(req: Request, { params }: { params: Promise<{ boardId: string }> }) {
  try {
    const { boardId } = await params;
    const { searchParams } = new URL(req.url);
    const includeCards = searchParams.get("includeCards") === "true";

    // --- Cleanup Old Archived Cards (older than 2 months) ---
    try {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      const archivedCards = await prisma.card.findMany({
        where: { boardId, archived: true },
        select: { id: true }
      });

      if (archivedCards.length > 0) {
        const archivedIds = archivedCards.map(c => c.id);
        const latestActivities = await prisma.activity.groupBy({
          by: ['cardId'],
          where: { cardId: { in: archivedIds } },
          _max: { createdAt: true }
        });

        const cardIdsToDelete = latestActivities
          .filter(a => a._max.createdAt && a._max.createdAt < twoMonthsAgo)
          .map(a => a.cardId)
          .filter(Boolean) as string[];

        if (cardIdsToDelete.length > 0) {
          await prisma.$transaction([
            prisma.activity.deleteMany({ where: { cardId: { in: cardIdsToDelete } } }),
            prisma.cardAssignment.deleteMany({ where: { cardId: { in: cardIdsToDelete } } }),
            prisma.cardLabel.deleteMany({ where: { cardId: { in: cardIdsToDelete } } }),
            prisma.attachment.deleteMany({ where: { cardId: { in: cardIdsToDelete } } }),
            prisma.comment.deleteMany({ where: { cardId: { in: cardIdsToDelete } } }),
            prisma.checklistItem.deleteMany({ where: { checklist: { cardId: { in: cardIdsToDelete } } } }),
            prisma.checklist.deleteMany({ where: { cardId: { in: cardIdsToDelete } } }),
            prisma.card.deleteMany({ where: { id: { in: cardIdsToDelete } } })
          ]);
        }
      }
    } catch (cleanupErr) {
      console.error("Cleanup error:", cleanupErr);
    }
    // --- End Cleanup ---

    // If includeCards is true, we fetch everything for initial load.
    // However, if the board is huge (e.g. 50 lists, 1000 cards), this will be slow.
    // Ideally, we should limit 'take' for cards per list (e.g. first 30), 
    // and implement "Load More" on the client.
    // For now, we add a safety limit of 50 cards per list to prevent massive payloads.
    
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { 
        lists: {
          orderBy: { order: "asc" },
          include: includeCards ? {
            cards: {
              where: { archived: false },
              orderBy: { order: "asc" },
              take: 50, // <-- Limit initial payload
              include: {
                assignments: {
                  select: { user: { select: { id: true, name: true, email: true, image: true } } }
                },
                _count: { select: { comments: true, attachments: true, checklists: true, assignments: true } },
              }
            }
          } : undefined
        } 
      },
    });
    if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(board);
  } catch (err) {
    console.error("GET /api/boards/:boardId error", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ boardId: string }> }) {
  try {
    const { boardId } = await params;
    const body = await req.json();
    const data: { title?: string; background?: string; isArchived?: boolean } = {};
    if (typeof body?.title === "string") data.title = body.title.trim();
    if (typeof body?.background === "string") data.background = body.background.trim();
    if (typeof body?.isArchived === "boolean") data.isArchived = body.isArchived;

    const board = await prisma.board.update({ where: { id: boardId }, data });
    try { 
      revalidateTag(`board:${boardId}`); 
      revalidatePath("/"); 
    } catch {}
    return NextResponse.json(board);
  } catch (err) {
    console.error("PATCH /api/boards/:boardId error", err);
    return NextResponse.json({ error: "Failed to update board" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ boardId: string }> }) {
  try {
    const cookie = (req.headers as any).get?.("cookie") || "";
    const m = cookie.match(/session=([^;]+)/);
    const token = m?.[1] || "";
    const session = token ? await verifySession(token) : null;
    if (!session?.admin) return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });

    const { boardId } = await params;
    // Instead of deleting, we archive the board
    await prisma.board.update({
      where: { id: boardId },
      data: { isArchived: true },
    });
    try { revalidateTag(`board:${boardId}`); revalidatePath("/"); } catch {}
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/boards/:boardId error", err);
    return NextResponse.json({ error: "Failed to delete board" }, { status: 500 });
  }
}