import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ boardId: string }> }) {
  try {
    const { boardId } = await params;
    const body = await req.json();
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    if (!ids.length) return NextResponse.json({ error: "ids required" }, { status: 400 });

    await prisma.$transaction(
      ids.map((id, idx) => prisma.list.update({ where: { id }, data: { order: idx } }))
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/boards/:boardId/lists/reorder error", err);
    return NextResponse.json({ error: "Failed to reorder lists" }, { status: 500 });
  }
}