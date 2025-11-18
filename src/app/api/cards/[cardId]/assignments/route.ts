import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    return NextResponse.json(full, { status: 201 });
  } catch (err) {
    console.error("POST /api/cards/[cardId]/assignments error", err);
    return NextResponse.json({ error: "Failed to assign member" }, { status: 500 });
  }
}