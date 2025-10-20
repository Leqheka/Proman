import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CreateBoard from "@/components/create-board";

export default async function Home() {
  let boards: Array<{ id: string; title: string }>; 
  try {
    boards = await prisma.board.findMany({
      select: { id: true, title: true },
      orderBy: { updatedAt: "desc" },
    });
  } catch (err) {
    console.error("Failed to fetch boards", err);
    boards = [];
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight">Proman</h1>
        <p className="mt-2 text-base text-foreground/70">
          Trello-like kanban with real-time collaboration.
        </p>

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Boards</h2>
          </div>
          <CreateBoard />
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.length === 0 ? (
              <div className="rounded-lg border border-black/10 dark:border-white/15 p-6">
                <p className="text-sm">No boards yet.</p>
                <p className="text-xs text-foreground/70">Create your first board to get started.</p>
              </div>
            ) : (
              boards.map((b) => (
                <Link key={b.id} href={`/boards/${b.id}`} className="rounded-lg border border-black/10 dark:border-white/15 p-6 block hover:bg-foreground/5">
                  <p className="text-sm font-medium">{b.title}</p>
                </Link>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
