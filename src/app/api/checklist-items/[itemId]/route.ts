import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
import { logActivity } from "@/lib/activity-log";

export async function PATCH(req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await params;
    const body = await req.json();
    if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

    const data: any = {};
    if (typeof body.completed === "boolean") data.completed = body.completed;
    if (typeof body.title === "string") data.title = body.title.trim();

    const updated = await prisma.checklistItem.update({ where: { id: itemId }, data, include: { checklist: true } });

    if (typeof body.completed === "boolean") {
      try {
        const cookie = (req.headers as any).get?.("cookie") || "";
        const m = cookie.match(/session=([^;]+)/);
        const token = m?.[1] || "";
        const session = token ? await verifySession(token) : null;
        if (session?.sub) {
          const action = body.completed ? "completed" : "uncompleted";
          await logActivity(
            updated.checklist.cardId,
            null,
            session.sub as string,
            "CHECKLIST_UPDATE",
            `${action} checklist item "${updated.title}"`
          );
        }
      } catch (e) {
        console.error("Failed to log checklist activity", e);
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/checklist-items/[itemId] error", err);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await params;
    if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

    await prisma.checklistItem.delete({ where: { id: itemId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/checklist-items/[itemId] error", err);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}