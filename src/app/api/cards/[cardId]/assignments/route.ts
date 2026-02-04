import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { verifySession } from "@/lib/session";
import { logActivity } from "@/lib/activity-log";
import { cookies } from "next/headers";

// List assigned members for a card
export async function GET(_req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  try {
    const { cardId } = await params;
    if (!cardId) return NextResponse.json({ error: "cardId required" }, { status: 400 });

  const assignments = await prisma.cardAssignment.findMany({
    where: { cardId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });
    const members = assignments.map((a) => a.user);
    return NextResponse.json(members);
  } catch (err) {
    console.error("GET /api/cards/[cardId]/assignments error", err);
    return NextResponse.json({ error: "Failed to list assignments" }, { status: 500 });
  }
}

// Assign a member to a card
export async function POST(req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  try {
    const { cardId } = await params;
    const body = await req.json();
    const userId = String(body?.userId ?? "").trim();
    if (!cardId) return NextResponse.json({ error: "cardId required" }, { status: 400 });
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const created = await prisma.cardAssignment.upsert({
      where: { userId_cardId: { userId, cardId } },
      update: {},
      create: { userId, cardId },
    });

    const full = await prisma.cardAssignment.findUnique({
      where: { userId_cardId: { userId, cardId } },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    });

    try {
      const card = await prisma.card.findUnique({ where: { id: cardId }, select: { boardId: true } });
      if (card?.boardId) revalidateTag(`board:${card.boardId}`);

      const cookieStore = await cookies();
      const token = cookieStore.get("session")?.value || "";
      const session = token ? await verifySession(token) : null;
      if (session?.sub && full?.user) {
        const assignedName = full.user.name || full.user.email || "someone";
        await logActivity(
          cardId,
          card?.boardId || null,
          session.sub as string,
          "MEMBER_ASSIGNED",
          `assigned ${assignedName} to this card`
        );
      }
    } catch {}

    return NextResponse.json(full, { status: 201 });
  } catch (err) {
    console.error("POST /api/cards/[cardId]/assignments error", err);
    return NextResponse.json({ error: "Failed to assign member" }, { status: 500 });
  }
}