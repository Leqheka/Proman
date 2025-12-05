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
    try {
      const user = await prisma.user.upsert({ where: { email: "placeholder@local" }, update: {}, create: { email: "placeholder@local", name: "Placeholder" } });
      const checklist = await prisma.checklist.findUnique({ where: { id: checklistId }, select: { cardId: true, card: { select: { boardId: true } } } });
      await prisma.activity.create({
        data: { type: "CHECKLIST_ITEM_CREATED", details: { message: `added item '${title}'` }, cardId: checklist?.cardId ?? undefined, boardId: checklist?.card?.boardId, userId: user.id } as any,
      });
    } catch {}
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/checklists/[checklistId]/items error", err);
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}
export async function GET(req: Request, { params }: { params: Promise<{ checklistId: string }> }) {
  try {
    const { checklistId } = await params;
    if (!checklistId) return NextResponse.json({ error: "checklistId required" }, { status: 400 });
    const { searchParams } = new URL(req.url);
    const take = Math.max(1, Math.min(500, Number(searchParams.get("take") ?? 100)));
    const cursor = searchParams.get("cursor") || null;
    const items = await prisma.checklistItem.findMany({
      where: { checklistId },
      orderBy: { id: "asc" },
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const res = NextResponse.json(items);
    res.headers.set("cache-control", "public, max-age=120, stale-while-revalidate=60");
    return res;
  } catch (err) {
    console.error("GET /api/checklists/[checklistId]/items error", err);
    return NextResponse.json({ error: "Failed to list items" }, { status: 500 });
  }
}
