import { prisma } from "@/lib/prisma";
import CreateList from "@/components/create-list";
import CreateCard from "@/components/create-card";

export default async function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  let boardTitle = "";
  let currentBoardId = "";
  let lists: Array<{ id: string; title: string; order: number; cards: Array<{ id: string; title: string; order: number }> }> = [];

  try {
    const { boardId } = await params;
    currentBoardId = boardId;
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { title: true, id: true },
    });
    boardTitle = board?.title ?? "Board";

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
  } catch (err) {
    console.error("Failed to fetch board or lists", err);
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
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-none px-6 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{boardTitle}</h1>
          {/* Quick create list in header */}
        </div>
        <div className="mt-4">
          <CreateList boardId={currentBoardId} />
        </div>

        <div className="mt-6 flex gap-4 overflow-x-auto pb-8">
          {lists.length === 0 ? (
            <div className="rounded-lg border border-black/10 dark:border-white/15 p-6 w-72 shrink-0">
              <p className="text-sm">No lists yet.</p>
              <p className="text-xs text-foreground/70">Create a list to organize your cards.</p>
              {/* Inline list create */}
              <div className="mt-3">
                {/* Fallback: requires a board id, fetch above if needed */}
              </div>
            </div>
          ) : (
            lists.map((l) => (
              <div key={l.id} className="w-72 shrink-0 rounded-lg border border-black/10 dark:border-white/15 bg-background/80 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{l.title}</p>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {l.cards.length === 0 ? (
                    <p className="text-xs text-foreground/60">No cards</p>
                  ) : (
                    l.cards.map((c) => (
                      <div key={c.id} className="rounded border border-black/10 dark:border-white/15 bg-foreground/5 p-3">
                        <p className="text-sm">{c.title}</p>
                      </div>
                    ))
                  )}
                </div>
                <CreateCard listId={l.id} />
              </div>
            ))
          )}
        </div>

        {/* Keep a simple create-list at the top */}
        <div className="mt-6 max-w-5xl">
          {/* Assumes the first list exists to pass boardId; alternatively render from fetched board */}
          {/* If you want a header create, we can place CreateList here with the board id */}
          {/* For now, render it only if we can infer a board id from any list */}
          {/* Replace with a dedicated header toolbar later */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
        </div>
      </main>
    </div>
  );
}