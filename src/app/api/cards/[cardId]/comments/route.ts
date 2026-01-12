import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";

export async function GET(req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  try {
    const { cardId } = await params;
    if (!cardId) return NextResponse.json({ error: "cardId required" }, { status: 400 });
    const { searchParams } = new URL(req.url);
    const take = Math.max(1, Math.min(200, Number(searchParams.get("take") ?? 20)));
    const cursor = searchParams.get("cursor") || undefined;

    const comments = await prisma.comment.findMany({
      where: { cardId },
      orderBy: { createdAt: "desc" },
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { author: { select: { id: true, name: true, email: true, image: true } } },
    });

    const res = NextResponse.json(comments);
    res.headers.set("cache-control", "public, max-age=30");
    return res;
  } catch (err) {
    console.error("GET /api/cards/[cardId]/comments error", err);
    return NextResponse.json({ error: "Failed to list comments" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  try {
    const { cardId } = await params;
    const body = await req.json();
    const content = (body?.content ?? "").trim();
    if (!cardId) return NextResponse.json({ error: "cardId required" }, { status: 400 });
    if (!content) return NextResponse.json({ error: "content required" }, { status: 400 });

    const cookie = (req.headers as any).get?.("cookie") || "";
    const m = cookie.match(/session=([^;]+)/);
    const token = m?.[1] || "";
    const session = token ? await verifySession(token) : null;
    
    if (!session?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const created = await prisma.comment.create({
      data: { content, cardId, userId: session.sub as string },
      include: { author: { select: { id: true, name: true, email: true, image: true } } },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/cards/[cardId]/comments error", err);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}
