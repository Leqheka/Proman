import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";

// Unassign a member from a card
export async function DELETE(_req: Request, { params }: { params: Promise<{ cardId: string; userId: string }> }) {
  try {
    const { cardId, userId } = await params;
    if (!cardId || !userId) return NextResponse.json({ error: "cardId and userId required" }, { status: 400 });

    await prisma.cardAssignment.delete({ where: { userId_cardId: { userId, cardId } } });
    try {
      const card = await prisma.card.findUnique({ where: { id: cardId }, select: { boardId: true } });
      if (card?.boardId) revalidateTag(`board:${card.boardId}`);
    } catch {}
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/cards/[cardId]/assignments/[userId] error", err);
    return NextResponse.json({ error: "Failed to unassign member" }, { status: 500 });
  }
}