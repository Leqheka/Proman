import { prisma } from "@/lib/prisma";
import BoardPageClient from "@/components/board-page-client";

export default async function BoardPage({ params }: { params: { boardId: string } }) {
  let boardTitle = "";
  let currentBoardId = "";
  let boardBackground = "";
  let lists: Array<{ id: string; title: string; order: number; cards: Array<{ id: string; title: string; order: number }> }> = [];
  let boards: Array<{ id: string; title: string }> = [];
  let archivedCards: Array<{ id: string; title: string; order: number; listId: string }> = [];

  try {
    const { boardId } = await params;
    currentBoardId = boardId;
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { title: true, id: true, background: true },
    });
    boardTitle = board?.title ?? "Board";
    boardBackground = board?.background ?? "";

    lists = await prisma.list.findMany({
      where: { boardId: boardId },
      orderBy: { order: "asc" },
      include: {
        cards: {
          where: { archived: false },
          orderBy: { order: "asc" },
          select: { id: true, title: true, order: true },
        },
      },
    });

    archivedCards = await prisma.card.findMany({
      where: { boardId: boardId, archived: true },
      orderBy: { order: "asc" },
      select: { id: true, title: true, order: true, listId: true },
    });

    boards = await prisma.board.findMany({ select: { id: true, title: true }, orderBy: { updatedAt: "desc" } });
  } catch (err) {
    // Quietly degrade when DB is unreachable; keep defaults so the page can decide what to render.
  }

  if (!boardTitle) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="mx-auto max-w-5xl px-6 py-16">
          <p className="text-sm">Board not found.</p>
        </main>
      </div>
    );
  }

  return (
    <BoardPageClient
      currentBoardId={currentBoardId}
      boardTitle={boardTitle}
      initialBackground={boardBackground}
      boards={boards}
      initialLists={lists}
      archivedCards={archivedCards}
    />
  );
}