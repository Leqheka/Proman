import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    if (!q) return NextResponse.json([]);

    const [cards, boards] = await Promise.all([
      prisma.card.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
          archived: false,
        },
        select: {
          id: true,
          title: true,
          boardId: true,
          listId: true,
          board: { select: { title: true } },
          list: { select: { title: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
      }),
      prisma.board.findMany({
        where: { title: { contains: q, mode: "insensitive" } },
        select: { id: true, title: true },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
    ]);

    const results = [
      ...cards.map((c) => ({
        type: "card" as const,
        id: c.id,
        title: c.title,
        boardId: c.boardId,
        boardTitle: c.board?.title,
        listId: c.listId,
        listTitle: c.list?.title,
      })),
      ...boards.map((b) => ({ type: "board" as const, id: b.id, title: b.title })),
    ];

    return NextResponse.json(results);
  } catch (err) {
    console.error("GET /api/search error", err);
    return NextResponse.json({ error: "Search unavailable" }, { status: 500 });
  }
}