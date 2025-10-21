import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await params;
    const body = await req.json();
    if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

    const data: any = {};
    if (typeof body.completed === "boolean") data.completed = body.completed;
    if (typeof body.title === "string") data.title = body.title.trim();

    const updated = await prisma.checklistItem.update({ where: { id: itemId }, data });
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