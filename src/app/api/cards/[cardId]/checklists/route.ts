import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  try {
    const { cardId } = await params;
    const body = await req.json();
    const title = (body?.title ?? "").trim();
    const copyFromChecklistId: string | null = body?.copyFromChecklistId || null;
    if (!cardId) return NextResponse.json({ error: "cardId required" }, { status: 400 });
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

    let created;
    await prisma.$transaction(async (tx) => {
      created = await tx.checklist.create({ data: { cardId, title } });
      if (copyFromChecklistId) {
        const srcItems = await tx.checklistItem.findMany({ where: { checklistId: copyFromChecklistId } });
        if (srcItems.length) {
          await tx.checklistItem.createMany({
            data: srcItems.map((it) => ({ checklistId: created!.id, title: it.title, completed: false })),
          });
        }
      }
    });

    return NextResponse.json(created!, { status: 201 });
  } catch (err) {
    console.error("POST /api/cards/[cardId]/checklists error", err);
    return NextResponse.json({ error: "Failed to add checklist" }, { status: 500 });
  }
}