import { prisma } from "@/lib/prisma";
import BoardPageClient from "@/components/board-page-client";
import { unstable_cache } from "next/cache";

async function loadBoardData(boardId: string) {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { title: true, id: true, background: true },
  });

  const rawLists = await prisma.list.findMany({
    where: { boardId },
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

  const lists = rawLists.map((l) => ({
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

  const archivedCards = await prisma.card.findMany({
    where: { boardId, archived: true },
    orderBy: { order: "asc" },
    select: { id: true, title: true, order: true, listId: true },
  });

  const boards = await prisma.board.findMany({ select: { id: true, title: true }, orderBy: { updatedAt: "desc" } });

  return {
    boardTitle: board?.title ?? "Board",
    currentBoardId: boardId,
    boardBackground: board?.background ?? "",
    lists,
    archivedCards,
    boards,
  };
}

async function getBoardDataCached(boardId: string) {
  const cached = unstable_cache(
    () => loadBoardData(boardId),
    ["board-page", boardId],
    { revalidate: 60, tags: [`board:${boardId}`] }
  );
  return cached();
}

export default async function BoardPage({ params }: { params: { boardId: string } }) {
  const { boardId } = params;
  try {
    const data = await getBoardDataCached(boardId);
    return (
      <BoardPageClient
        currentBoardId={data.currentBoardId}
        boardTitle={data.boardTitle}
        initialBackground={data.boardBackground}
        boards={data.boards}
        initialLists={data.lists as any}
        archivedCards={data.archivedCards}
      />
    );
  } catch (err) {
    return (
      <BoardPageClient
        currentBoardId={boardId}
        boardTitle={"Board"}
        initialBackground={""}
        boards={[]}
        initialLists={[] as any}
        archivedCards={[]}
      />
    );
  }
}