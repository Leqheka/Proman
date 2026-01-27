import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
import { logActivity } from "@/lib/activity-log";

export async function GET(req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  try {
    const { cardId } = await params;
    if (!cardId) return NextResponse.json({ error: "cardId required" }, { status: 400 });
    const { searchParams } = new URL(req.url);
    const withItems = (searchParams.get("withItems") ?? "0") === "1";
    const takeItems = Math.max(1, Math.min(500, Number(searchParams.get("takeItems") ?? 50)));
    if (withItems) {
      const checklists = await prisma.checklist.findMany({
        where: { cardId },
        include: { items: { take: takeItems, orderBy: { order: "asc" } } },
        orderBy: { id: "asc" },
      });
      const res = NextResponse.json(checklists);
      res.headers.set("cache-control", "public, max-age=120, stale-while-revalidate=60");
      return res;
    }
    const rows = await prisma.checklist.findMany({
      where: { cardId },
      orderBy: { id: "asc" },
      include: { _count: { select: { items: true } } },
    });
    const meta = rows.map((r: any) => ({ id: r.id, title: r.title, itemsCount: r._count?.items ?? 0 }));
    const res = NextResponse.json(meta);
    res.headers.set("cache-control", "public, max-age=120, stale-while-revalidate=60");
    return res;
  } catch (err) {
    console.error("GET /api/cards/[cardId]/checklists error", err);
    return NextResponse.json({ error: "Failed to list checklists" }, { status: 500 });
  }
}

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

    const withItems = await prisma.checklist.findUnique({ where: { id: created!.id }, include: { items: true } });
    try {
      const cookie = (req.headers as any).get?.("cookie") || "";
      const m = cookie.match(/session=([^;]+)/);
      const token = m?.[1] || "";
      const session = token ? await verifySession(token) : null;
      if (session?.sub) {
        const card = await prisma.card.findUnique({ where: { id: cardId }, select: { boardId: true } });
        await logActivity(
          cardId,
          card?.boardId || null,
          session.sub as string,
          "CHECKLIST_CREATED",
          `created checklist '${title}'`
        );
      }
    } catch (e) {
      console.error("Failed to log checklist creation", e);
    }
    return NextResponse.json(withItems!, { status: 201 });
  } catch (err) {
    console.error("POST /api/cards/[cardId]/checklists error", err);
    return NextResponse.json({ error: "Failed to add checklist" }, { status: 500 });
  }
}
