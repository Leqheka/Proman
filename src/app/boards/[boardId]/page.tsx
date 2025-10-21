import { prisma } from "@/lib/prisma";
import BoardToolbar from "@/components/board-toolbar";
import BoardContentClient from "@/components/board-content-client";

export default async function BoardPage({ params }: { params: { boardId: string } }) {
  let boardTitle = "";
  let currentBoardId = "";
  let boardBackground = "";
  let lists: Array<{ id: string; title: string; order: number; cards: Array<{ id: string; title: string; order: number }> }> = [];
  let boards: Array<{ id: string; title: string }> = [];

  try {
    const { boardId } = params;
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

  const DEFAULT_BG = "https://picsum.photos/id/1018/1600/900";
  const bgRaw = (boardBackground && boardBackground !== "/default-bg.jpg") ? boardBackground : DEFAULT_BG;
  const bgUrl = (bgRaw && bgRaw.startsWith("http")) ? `/api/image-proxy?url=${encodeURIComponent(bgRaw)}` : bgRaw;

  return (
    <div
      className="min-h-screen text-foreground"
      style={{
        backgroundImage: `url(${bgUrl}), linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)`,
        backgroundSize: "cover, auto",
        backgroundPosition: "center, center",
      }}
    >
      <main className="mx-auto max-w-none py-0">
        <BoardToolbar boards={boards} currentBoardId={currentBoardId} boardTitle={boardTitle} />
        <BoardContentClient boardId={currentBoardId} initialLists={lists} />
      </main>
    </div>
  );
}