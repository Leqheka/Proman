import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ boardId: string }> }) {
  try {
    const { boardId } = await params;
    if (!boardId) return NextResponse.json({ error: "boardId required" }, { status: 400 });

    const checklists = await prisma.checklist.findMany({
      where: { card: { boardId } },
      select: { id: true, title: true, cardId: true },
      orderBy: { title: "asc" },
    });

    return NextResponse.json(checklists);
  } catch (err) {
    console.error("GET /api/boards/[boardId]/checklists error", err);
    return NextResponse.json({ error: "Failed to list checklists" }, { status: 500 });
  }
}