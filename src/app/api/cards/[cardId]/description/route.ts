import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Return only the description field for a card
export async function GET(_req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  try {
    const { cardId } = await params;
    if (!cardId) return NextResponse.json({ error: "cardId required" }, { status: 400 });

    const card = await prisma.card.findUnique({ where: { id: cardId }, select: { description: true } });
    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });
    return NextResponse.json({ description: card.description ?? "" });
  } catch (err) {
    console.error("GET /api/cards/[cardId]/description error", err);
    return NextResponse.json({ error: "Failed to fetch description" }, { status: 500 });
  }
}