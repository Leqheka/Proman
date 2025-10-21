import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  try {
    const { cardId } = await params;
    const body = await req.json();
    const content = (body?.content ?? "").trim();
    if (!cardId) return NextResponse.json({ error: "cardId required" }, { status: 400 });
    if (!content) return NextResponse.json({ error: "content required" }, { status: 400 });

    // Temporary: use placeholder user
    const user = await prisma.user.upsert({
      where: { email: "placeholder@local" },
      update: {},
      create: { email: "placeholder@local", name: "Placeholder" },
    });

    const created = await prisma.comment.create({
      data: { content, cardId, userId: user.id },
      include: { author: { select: { id: true, name: true, email: true, image: true } } },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/cards/[cardId]/comments error", err);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}