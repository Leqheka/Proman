import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const cookie = (req.headers as any).get?.("cookie") || "";
    const m = cookie.match(/session=([^;]+)/);
    const token = m?.[1] || "";
    const payload = token ? await verifySession(token) : null;
    const isAdmin = payload?.admin === true;

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    if (!q) return NextResponse.json([]);

    const cardWhere: any = {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
      archived: false,
    };
    const boardWhere: any = { title: { contains: q, mode: "insensitive" } };

    if (!isAdmin) {
      cardWhere.board = { title: { not: { equals: "Admin", mode: "insensitive" } } };
      boardWhere.AND = [ { title: { not: { equals: "Admin", mode: "insensitive" } } } ];
    }

    const [cards, boards] = await Promise.all([
      prisma.card.findMany({
        where: cardWhere,
        select: {
          id: true,
          title: true,
          boardId: true,
          listId: true,
          board: { select: { title: true } },
          list: { select: { title: true } },
        },
        orderBy: { order: "desc" },
        take: 20,
      }),
      prisma.board.findMany({
        where: boardWhere,
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