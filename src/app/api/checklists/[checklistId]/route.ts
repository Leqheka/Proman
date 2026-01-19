import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
import { logActivity } from "@/lib/activity-log";

export async function PATCH(req: Request, { params }: { params: Promise<{ checklistId: string }> }) {
  try {
    const { checklistId } = await params;
    const body = await req.json();
    if (!checklistId) return NextResponse.json({ error: "checklistId required" }, { status: 400 });

    const data: any = {};
    if (typeof body?.title === "string") data.title = body.title.trim();
    if (Object.keys(data).length === 0) return NextResponse.json({ error: "No valid fields" }, { status: 400 });

    const updated = await prisma.checklist.update({ where: { id: checklistId }, data });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/checklists/[checklistId] error", err);
    return NextResponse.json({ error: "Failed to update checklist" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ checklistId: string }> }) {
  try {
    const { checklistId } = await params;
    if (!checklistId) return NextResponse.json({ error: "checklistId required" }, { status: 400 });

    const checklist = await prisma.checklist.findUnique({
      where: { id: checklistId },
      include: { card: { select: { boardId: true } } }
    });

    if (checklist) {
      try {
        const cookie = (req.headers as any).get?.("cookie") || "";
        const m = cookie.match(/session=([^;]+)/);
        const token = m?.[1] || "";
        const session = token ? await verifySession(token) : null;
        if (session?.sub) {
          await logActivity(
            checklist.cardId,
            checklist.card?.boardId || null,
            session.sub as string,
            "CHECKLIST_DELETED",
            `deleted checklist '${checklist.title}'`
          );
        }
      } catch (e) {
        console.error("Failed to log checklist deletion", e);
      }
    }

    await prisma.checklistItem.deleteMany({ where: { checklistId } });
    await prisma.checklist.delete({ where: { id: checklistId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/checklists/[checklistId] error", err);
    return NextResponse.json({ error: "Failed to delete checklist" }, { status: 500 });
  }
}