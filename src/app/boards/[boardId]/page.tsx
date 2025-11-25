import { prisma } from "@/lib/prisma";
import BoardPageClient from "@/components/board-page-client";

export default async function BoardPage({ params }: { params: { boardId: string } }) {
  let boardTitle = "";
  let currentBoardId = "";
  let boardBackground = "";
  let lists: Array<{
    id: string;
    title: string;
    order: number;
    cards: Array<{
      id: string;
      title: string;
      order: number;
      dueDate?: Date | null;
      hasDescription?: boolean;
      commentsCount?: number;
      attachmentsCount?: number;
      checklistsCount?: number;
      membersCount?: number;
      members?: Array<{ id: string; name: string | null; email: string; image: string | null }>;
    }>;
  }> = [];
  let boards: Array<{ id: string; title: string }> = [];
  let archivedCards: Array<{ id: string; title: string; order: number; listId: string }> = [];

  try {
    const { boardId } = params; // use params directly
    currentBoardId = boardId;
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { title: true, id: true, background: true },
    });
    boardTitle = board?.title ?? "Board";
    boardBackground = board?.background ?? "";

    const rawLists = await prisma.list.findMany({
      where: { boardId: boardId },
      orderBy: { order: "asc" },
      include: {
        cards: {
          where: { archived: false },
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            order: true,
            dueDate: true,
            description: true,
            assignments: { select: { user: { select: { id: true, name: true, email: true, image: true } } } },
            _count: { select: { comments: true, attachments: true, checklists: true, assignments: true } },
          },
        },
      },
    });

    lists = rawLists.map((l) => ({
      id: l.id,
      title: l.title,
      order: l.order,
      cards: l.cards.map((c) => ({
        id: c.id,
        title: c.title,
        order: c.order,
        dueDate: c.dueDate ?? null,
        hasDescription: !!c.description && c.description.trim().length > 0,
        commentCount: (c as any)._count?.comments ?? 0,
        attachmentCount: (c as any)._count?.attachments ?? 0,
        checklistCount: (c as any)._count?.checklists ?? 0,
        assignmentCount: (c as any)._count?.assignments ?? 0,
        members: (c as any).assignments?.map((a: any) => ({ id: a.user.id, name: a.user.name, email: a.user.email, image: a.user.image })) ?? [],
      })),
    }));

    archivedCards = await prisma.card.findMany({
      where: { boardId: boardId, archived: true },
      orderBy: { order: "asc" },
      select: { id: true, title: true, order: true, listId: true },
    });

    boards = await prisma.board.findMany({ select: { id: true, title: true }, orderBy: { updatedAt: "desc" } });
  } catch (err) {
    currentBoardId = currentBoardId || params.boardId;
    boardTitle = boardTitle || "Board";
  }

  return (
    <BoardPageClient
      currentBoardId={currentBoardId}
      boardTitle={boardTitle}
      initialBackground={boardBackground}
      boards={boards}
      initialLists={lists as any}
      archivedCards={archivedCards}
    />
  );
}