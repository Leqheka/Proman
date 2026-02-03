import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
import { logActivity } from "@/lib/activity-log";

export async function POST(req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  try {
    const { cardId } = await params;
    if (!cardId) return NextResponse.json({ error: "cardId required" }, { status: 400 });

    const body = await req.json();
    const listIds: string[] = body.listIds || [];
    if (!Array.isArray(listIds)) return NextResponse.json({ error: "listIds array required" }, { status: 400 });

    // Get current lists on the board to get titles
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { list: { include: { board: { include: { lists: true } } } } }
    });
    
    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });
    const availableLists = card.list.board.lists;

    let workflowChecklist;
    await prisma.$transaction(async (tx) => {
      // 1. Find or create Workflow Checklist
      workflowChecklist = await tx.checklist.findFirst({
        where: { cardId, title: "Workflow Checklist" }
      });

      if (!workflowChecklist) {
        workflowChecklist = await tx.checklist.create({
          data: { cardId, title: "Workflow Checklist" }
        });
      }

      // 2. Clear existing items
      await tx.checklistItem.deleteMany({
        where: { checklistId: workflowChecklist.id }
      });

      // 3. Create new items
      if (listIds.length > 0) {
        await tx.checklistItem.createMany({
          data: listIds.map((listId, i) => {
            const listTitle = availableLists.find(l => l.id === listId)?.title || "Unknown List";
            return {
              checklistId: workflowChecklist!.id,
              title: `${listTitle}|${listId}`,
              order: i,
              completed: false
            };
          })
        });
      }
    });

    const updatedChecklist = await prisma.checklist.findUnique({
      where: { id: workflowChecklist!.id },
      include: { items: { orderBy: { order: "asc" } } }
    });

    // Log activity
    try {
      const cookie = req.headers.get("cookie") || "";
      const m = cookie.match(/session=([^;]+)/);
      const token = m?.[1] || "";
      const session = token ? await verifySession(token) : null;
      if (session?.sub) {
        await logActivity(
          cardId,
          card.list.boardId,
          session.sub as string,
          "CHECKLIST_CREATED",
          `updated workflow with ${listIds.length} stages`
        );
      }
    } catch (e) {
      console.error("Failed to log workflow activity", e);
    }

    return NextResponse.json(updatedChecklist);
  } catch (err) {
    console.error("POST /api/cards/[cardId]/workflow error", err);
    return NextResponse.json({ error: "Failed to update workflow" }, { status: 500 });
  }
}
