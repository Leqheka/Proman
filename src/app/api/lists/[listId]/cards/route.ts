import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ listId: string }> }) {
  try {
    const { listId } = await params;
    const { searchParams } = new URL(req.url);
    const take = Math.max(1, Math.min(500, Number(searchParams.get("take") ?? 50)));
    const cursor = searchParams.get("cursor") || undefined;
    const cards = await prisma.card.findMany({
      where: { listId, archived: false },
      orderBy: { order: "asc" },
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    return NextResponse.json(cards);
  } catch (err) {
    console.error("GET /api/lists/:listId/cards error", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ listId: string }> }) {
  try {
    const { listId } = await params;
    const body = await req.json();
    const title = (body?.title ?? "").trim();
    const description = typeof body?.description === "string" ? body.description.trim() : undefined;
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

    const list = await prisma.list.findUnique({
      where: { id: listId },
      select: { boardId: true },
    });
    if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

    const count = await prisma.card.count({ where: { listId, archived: false } });
    const card = await prisma.card.create({
      data: {
        title,
        description,
        listId,
        boardId: list.boardId,
        order: count,
      },
    });
    return NextResponse.json(card, { status: 201 });
  } catch (err) {
    console.error("POST /api/lists/:listId/cards error", err);
    return NextResponse.json({ error: "Failed to create card" }, { status: 500 });
  }
}