import { prisma } from "@/lib/prisma";
import CreateList from "@/components/create-list";

export default async function BoardPage({ params }: { params: { boardId: string } }) {
  let board: { id: string; title: string; lists: Array<{ id: string; title: string }> } | null = null;
  try {
    board = await prisma.board.findUnique({
      where: { id: params.boardId },
      include: { lists: true },
    });
  } catch (err) {
    console.error("Failed to fetch board", err);
  }

  if (!board) {
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
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold">{board.title}</h1>
        <div className="mt-6">
          <CreateList boardId={board.id} />
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {board.lists.length === 0 ? (
            <div className="rounded-lg border border-black/10 dark:border-white/15 p-6">
              <p className="text-sm">No lists yet.</p>
              <p className="text-xs text-foreground/70">Create a list to organize your cards.</p>
            </div>
          ) : (
            board.lists.map((l) => (
              <div key={l.id} className="rounded-lg border border-black/10 dark:border-white/15 p-6">
                <p className="text-sm font-medium">{l.title}</p>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}