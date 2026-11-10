import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ boardId: string }> }) {
  try {
    const { boardId } = await params;
    if (!boardId) return NextResponse.json({ error: "boardId required" }, { status: 400 });

    const lists = await prisma.list.findMany({
      where: { boardId, isArchived: false },
      select: { id: true, title: true, defaultChecklist: true },
    });

    const checklists: Array<{ id: string; title: string }> = [];
    
    for (const list of lists) {
      if (list.defaultChecklist) {
        const rawDefaults = list.defaultChecklist as any[];
        if (Array.isArray(rawDefaults) && rawDefaults.length > 0) {
          const isNewFormat = rawDefaults.some(item => 'items' in item && Array.isArray(item.items));
          if (isNewFormat) {
            rawDefaults.forEach((cl, idx) => {
              if (cl.title) {
                checklists.push({ id: `template:${list.id}:${idx}`, title: `${cl.title} (from ${list.title})` });
              }
            });
          } else {
            checklists.push({ id: `template:${list.id}:0`, title: `Checklist (from ${list.title})` });
          }
        }
      }
    }

    return NextResponse.json(checklists);
  } catch (err) {
    console.error("GET /api/boards/[boardId]/checklists error", err);
    return NextResponse.json({ error: "Failed to list checklists" }, { status: 500 });
  }
}