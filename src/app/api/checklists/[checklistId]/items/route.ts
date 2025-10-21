import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ checklistId: string }> }) {
  try {
    const { checklistId } = await params;
    const body = await req.json();
    const title = (body?.title ?? "").trim();
    if (!checklistId) return NextResponse.json({ error: "checklistId required" }, { status: 400 });
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

    const created = await prisma.checklistItem.create({ data: { checklistId, title } });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/checklists/[checklistId]/items error", err);
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}