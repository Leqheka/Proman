import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { verifySession } from "@/lib/session";
import { logActivity } from "@/lib/activity-log";
import { cookies } from "next/headers";

// Unassign a member from a card
export async function DELETE(_req: Request, { params }: { params: Promise<{ cardId: string; userId: string }> }) {
  try {
    const { cardId, userId } = await params;
    if (!cardId || !userId) return NextResponse.json({ error: "cardId and userId required" }, { status: 400 });

    const userToRemove = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });

    await prisma.cardAssignment.delete({ where: { userId_cardId: { userId, cardId } } });
    try {
      const card = await prisma.card.findUnique({ where: { id: cardId }, select: { boardId: true } });
      if (card?.boardId) revalidateTag(`board:${card.boardId}`);

      const cookieStore = await cookies();
      const token = cookieStore.get("session")?.value || "";
      const session = token ? await verifySession(token) : null;
      if (session?.sub && userToRemove) {
        const removedName = userToRemove.name || userToRemove.email || "someone";
        await logActivity(
          cardId,
          card?.boardId || null,
          session.sub as string,
          "MEMBER_REMOVED",
          `removed ${removedName} from this card`
        );
      }
    } catch {}
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/cards/[cardId]/assignments/[userId] error", err);
    return NextResponse.json({ error: "Failed to unassign member" }, { status: 500 });
  }
}