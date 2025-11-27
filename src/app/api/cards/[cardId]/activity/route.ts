import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  try {
    const { cardId } = await params;
    if (!cardId) return NextResponse.json({ error: "cardId required" }, { status: 400 });
    const { searchParams } = new URL(req.url);
    const take = Math.max(1, Math.min(200, Number(searchParams.get("take") ?? 50)));
    const cursor = searchParams.get("cursor") || null;
    const orderParam = (searchParams.get("order") || "desc").toLowerCase();
    const orderBy = orderParam === "asc" ? "asc" : "desc";
    const type = searchParams.get("type") || undefined;
    const rows = await prisma.activity.findMany({
      where: { cardId, ...(type ? { type } : {}) },
      orderBy: { createdAt: orderBy as any },
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    });
    const res = NextResponse.json(rows);
    res.headers.set("cache-control", "public, max-age=15");
    return res;
  } catch (err) {
    console.error("GET /api/cards/[cardId]/activity error", err);
    return NextResponse.json({ error: "Failed to list activity" }, { status: 500 });
  }
}
