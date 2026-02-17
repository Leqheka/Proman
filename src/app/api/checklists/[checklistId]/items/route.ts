import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
import { logActivity } from "@/lib/activity-log";

export async function POST(req: Request, { params }: { params: Promise<{ checklistId: string }> }) {
  try {
    const { checklistId } = await params;
    const body = await req.json();
    const title = (body?.title ?? "").trim();
    const order = typeof body?.order === "number" ? body.order : 0;

    if (!checklistId) return NextResponse.json({ error: "checklistId required" }, { status: 400 });
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

    const created = await prisma.checklistItem.create({ data: { checklistId, title, order } });
    
    try {
      const cookie = (req.headers as any).get?.("cookie") || "";
      const m = cookie.match(/session=([^;]+)/);
      const token = m?.[1] || "";
      const session = token ? await verifySession(token) : null;
      if (session?.sub) {
        const checklist = await prisma.checklist.findUnique({ where: { id: checklistId }, select: { cardId: true, card: { select: { boardId: true } } } });
        if (checklist?.cardId) {
          await logActivity(
            checklist.cardId,
            checklist.card?.boardId || null,
            session.sub as string,
            "CHECKLIST_ITEM_CREATED",
            `added item '${title}'`
          );
        }
      }
    } catch (e) {
      console.error("Failed to log checklist item creation", e);
    }
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
      orderBy: [{ order: "asc" }, { id: "asc" }],
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

export async function PUT(req: Request, { params }: { params: Promise<{ checklistId: string }> }) {
  try {
    const { checklistId } = await params;
    const body = await req.json();
    const { items } = body; 

    if (!checklistId) return NextResponse.json({ error: "checklistId required" }, { status: 400 });
    if (!Array.isArray(items)) return NextResponse.json({ error: "items array required" }, { status: 400 });

    // For reordering small lists (checklists usually < 50 items),
    // mapping update promises into $transaction is efficient enough.
    // Ensure all promises are created before passing to transaction.
    
    const updates = items.map((item: any) => 
      prisma.checklistItem.update({
        where: { id: item.id },
        data: { order: item.order }
      })
    );

    await prisma.$transaction(updates);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT /api/checklists/[checklistId]/items reorder error", err);
    return NextResponse.json({ error: "Failed to reorder items" }, { status: 500 });
  }
}
