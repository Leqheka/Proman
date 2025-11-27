import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  try {
    const { cardId } = await params;
    if (!cardId) return NextResponse.json({ error: "cardId required" }, { status: 400 });
    const { searchParams } = new URL(req.url);
    const take = Math.max(1, Math.min(200, Number(searchParams.get("take") ?? 20)));
    const cursor = searchParams.get("cursor") || undefined;

    const attachments = await prisma.attachment.findMany({
      where: { cardId },
      orderBy: { id: "desc" },
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const res = NextResponse.json(attachments);
    res.headers.set("cache-control", "public, max-age=30");
    return res;
  } catch (err) {
    console.error("GET /api/cards/[cardId]/attachments error", err);
    return NextResponse.json({ error: "Failed to list attachments" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  try {
    const { cardId } = await params;
    const body = await req.json();
    const rawUrl = (body?.url ?? "").trim();
    if (!cardId) return NextResponse.json({ error: "cardId required" }, { status: 400 });
    if (!rawUrl) return NextResponse.json({ error: "url required" }, { status: 400 });

    const filename = (body?.filename ?? decodeURIComponent(rawUrl.split("/").pop() || "attachment")).trim();
    const type = (body?.type ?? "link").trim();
    const size = Number(body?.size ?? 0);

    const created = await prisma.attachment.create({
      data: { cardId, url: rawUrl, filename, type, size },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/cards/[cardId]/attachments error", err);
    return NextResponse.json({ error: "Failed to add attachment" }, { status: 500 });
  }
}
