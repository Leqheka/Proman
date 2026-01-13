import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
import { logActivity } from "@/lib/activity-log";

export async function GET(req: Request, { params }: { params: Promise<{ listId: string }> }) {
  try {
    const { listId } = await params;
    const { searchParams } = new URL(req.url);
    const take = Math.max(1, Math.min(500, Number(searchParams.get("take") ?? 50)));
    const cursor = searchParams.get("cursor") || undefined;
    const cards = await prisma.card.findMany({
      where: { listId, archived: false },
      orderBy: { order: "asc" },
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    return NextResponse.json(cards);
  } catch (err) {
    console.error("GET /api/lists/:listId/cards error", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ listId: string }> }) {
  try {
    const { listId } = await params;
    const body = await req.json();
    const title = (body?.title ?? "").trim();
    const description = typeof body?.description === "string" ? body.description.trim() : undefined;
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

    const list = await prisma.list.findUnique({
      where: { id: listId },
      select: { 
        boardId: true,
        defaultDueDays: true,
        defaultMemberIds: true,
        defaultChecklist: true
      },
    });
    if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

  let dueDate: Date | undefined;
  if (typeof list.defaultDueDays === 'number') {
    dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + list.defaultDueDays);
  }

  const count = await prisma.card.count({ where: { listId, archived: false } });
  const card = await prisma.card.create({
    data: {
      title,
      description,
      listId,
      boardId: list.boardId,
      order: count,
      dueDate,
    },
  });

  // Apply defaults
  if (list.defaultMemberIds && list.defaultMemberIds.length > 0) {
    await prisma.cardAssignment.createMany({
      data: list.defaultMemberIds.map(uid => ({ cardId: card.id, userId: uid })),
      skipDuplicates: true
    });
  }

  if (list.defaultChecklist) {
    const items = list.defaultChecklist as any[];
    if (Array.isArray(items) && items.length > 0) {
      const checklist = await prisma.checklist.create({
        data: { title: "Checklist", cardId: card.id }
      });
      await prisma.checklistItem.createMany({
        data: items.map(i => ({ checklistId: checklist.id, title: i.title, completed: !!i.completed }))
      });
    }
  }
  
  try {
    const cookie = (req.headers as any).get?.("cookie") || "";
    const m = cookie.match(/session=([^;]+)/);
    const token = m?.[1] || "";
    const session = token ? await verifySession(token) : null;

    if (session?.sub) {
      await logActivity(
        card.id,
        list.boardId,
        session.sub as string,
        "CARD_CREATED",
        `created card '${title}'`
      );
    }
  } catch (e) {
    console.error("Failed to log card creation", e);
  }

  // Fetch full card details to return to frontend (so icons/counts appear immediately)
  const fullCard = await prisma.card.findUnique({
    where: { id: card.id },
    include: {
      assignments: { include: { user: true } },
      checklists: { include: { items: true } },
      _count: {
        select: {
          comments: true,
          attachments: true,
        }
      }
    }
  });

  if (fullCard) {
    const responseCard = {
      ...fullCard,
      checklistCount: fullCard.checklists.reduce((acc, c) => acc + c.items.length, 0),
      commentCount: fullCard._count.comments,
      attachmentCount: fullCard._count.attachments,
      assignmentCount: fullCard.assignments.length,
      members: fullCard.assignments.map(a => ({
        id: a.user.id,
        name: a.user.name,
        email: a.user.email,
        image: a.user.image
      }))
    };
    return NextResponse.json(responseCard, { status: 201 });
  }

  return NextResponse.json(card, { status: 201 });
  } catch (err) {
    console.error("POST /api/lists/:listId/cards error", err);
    return NextResponse.json({ error: "Failed to create card" }, { status: 500 });
  }
}
