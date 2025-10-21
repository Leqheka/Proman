import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  try {
    const { cardId } = await params;
    const body = await req.json();
    const title = (body?.title ?? "").trim();
    if (!cardId) return NextResponse.json({ error: "cardId required" }, { status: 400 });
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

    const created = await prisma.checklist.create({ data: { cardId, title } });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/cards/[cardId]/checklists error", err);
    return NextResponse.json({ error: "Failed to add checklist" }, { status: 500 });
  }
}