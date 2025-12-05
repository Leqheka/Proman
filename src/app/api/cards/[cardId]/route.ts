import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const t0 = Date.now();
    const { cardId } = await params;
    if (!cardId) return NextResponse.json({ error: "cardId required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const summaryParam = (searchParams.get("summary") ?? "").toLowerCase();
    const isSummary = summaryParam === "1" || summaryParam === "true" || summaryParam === "yes";
    const commentsCursor = searchParams.get("commentsCursor") || undefined;

    const include = isSummary
      ? {
          list: { select: { id: true, title: true, boardId: true } },
          board: { select: { id: true, title: true } },
          labels: { include: { label: true } },
          _count: { select: { comments: true, attachments: true, checklists: true, assignments: true } },
        }
      : {
          list: { select: { id: true, title: true, boardId: true } },
          board: { select: { id: true, title: true } },
          labels: {
            include: { label: true },
          },
          attachments: true,
          comments: {
            orderBy: { createdAt: "desc" as const },
            take: 50,
            ...(commentsCursor ? { cursor: { id: commentsCursor }, skip: 1 } : {}),
            include: { author: { select: { id: true, name: true, email: true, image: true } } },
          },
          checklists: {
            include: { items: true },
          },
          assignments: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
        };

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include,
    });
    console.info("[API/cards:id] query_ms=", Date.now() - t0, "summary=", isSummary);

    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });

    const result = {
      id: card.id,
      title: card.title,
      description: isSummary ? "" : (card.description ?? ""),
      hasDescription: !!card.description && (card.description?.trim()?.length ?? 0) > 0,
      order: card.order,
      archived: card.archived,
      dueDate: card.dueDate,
      createdAt: (card as any).createdAt,
      list: card.list,
      board: card.board,
      labels: card.labels.map((cl: any) => cl.label),
      attachments: isSummary ? [] : (card as any).attachments,
      comments: isSummary ? [] : (card as any).comments,
      checklists: isSummary ? [] : (card as any).checklists,
      members: isSummary ? [] : ((card as any).assignments?.map((a: any) => a.user) ?? []),
      commentCount: isSummary ? ((card as any)._count?.comments ?? 0) : ((card as any).comments?.length ?? 0),
      attachmentCount: isSummary ? ((card as any)._count?.attachments ?? 0) : ((card as any).attachments?.length ?? 0),
      checklistCount: isSummary ? ((card as any)._count?.checklists ?? 0) : ((card as any).checklists?.length ?? 0),
      assignmentCount: isSummary ? ((card as any)._count?.assignments ?? 0) : (((card as any).assignments?.length) ?? 0),
    };
    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/cards/[cardId] error", err);
    return NextResponse.json({ error: "Failed to fetch card" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params;
    const body = await req.json();
    if (!cardId) return NextResponse.json({ error: "cardId required" }, { status: 400 });

    const data: any = {};
    if (typeof body.title === "string") data.title = body.title.trim();
    if (typeof body.description === "string") data.description = body.description;
    if (typeof body.archived === "boolean") data.archived = body.archived;
    if (body.dueDate) {
      const d = new Date(body.dueDate);
      if (!isNaN(d.getTime())) data.dueDate = d;
      else data.dueDate = null;
    }

    const updated = await prisma.card.update({
      where: { id: cardId },
      data,
      include: { list: { select: { boardId: true } } },
    });

    try {
      const bId = (updated as any)?.list?.boardId;
      if (bId) revalidateTag(`board:${bId}`);
    } catch {}

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/cards/[cardId] error", err);
    return NextResponse.json({ error: "Failed to update card" }, { status: 500 });
  }
}
