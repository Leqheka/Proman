import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  try {
    const { cardId } = await params;
    if (!cardId) return NextResponse.json({ error: "cardId required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get("ids");
    const take = Math.max(1, Math.min(500, Number(searchParams.get("take") ?? 200)));

    let targetIds: string[] = [];
    if (idsParam && idsParam.trim().length) {
      targetIds = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
    } else {
      const first = await prisma.checklist.findMany({
        where: { cardId },
        select: { id: true },
        orderBy: { id: "asc" },
        take: 3,
      });
      targetIds = first.map((f) => f.id);
    }

    if (targetIds.length === 0) {
      const res = NextResponse.json([]);
      res.headers.set("cache-control", "public, max-age=120, stale-while-revalidate=60");
      return res;
    }

    const rows = await prisma.checklist.findMany({
      where: { cardId, id: { in: targetIds } },
      select: { id: true, title: true, items: { take, orderBy: { id: "asc" } } },
      orderBy: { id: "asc" },
    });

    const res = NextResponse.json(rows);
    res.headers.set("cache-control", "public, max-age=120, stale-while-revalidate=60");
    return res;
  } catch (err) {
    console.error("GET /api/cards/[cardId]/checklists/items error", err);
    return NextResponse.json({ error: "Failed to list checklist items" }, { status: 500 });
  }
}
