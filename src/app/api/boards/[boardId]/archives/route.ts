import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ boardId: string }> }) {
  try {
    const { boardId } = await params;
    if (!boardId) return NextResponse.json({ error: "boardId required" }, { status: 400 });
    const cards = await prisma.card.findMany({
      where: { boardId, archived: true },
      include: { list: { select: { title: true } } },
    });
    const items = cards.map((c) => ({ id: c.id, title: c.title, listId: c.listId, listTitle: c.list?.title ?? "" }));
    return NextResponse.json(items);
  } catch (err) {
    return NextResponse.json({ error: "Failed to load archives" }, { status: 500 });
  }
}
