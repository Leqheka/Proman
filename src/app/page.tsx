import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
import CreateBoard from "@/components/create-board";
import HomeScene from "@/components/home-scene";
import BoardCard from "@/components/board-card";

export const revalidate = 60; // cache homepage data for snappier loads

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value || "";
  const payload = token ? await verifySession(token) : null;
  const isAdmin = !!payload?.admin;

  let boards: Array<{ id: string; title: string; background: string | null }>;
  try {
    boards = await prisma.board.findMany({
      where: { isArchived: false },
      select: { id: true, title: true, background: true },
      orderBy: { updatedAt: "desc" },
    });
  } catch (err: any) {
    // Graceful fallback: quietly degrade when the database is unreachable or Prisma throws
    const isDbUnreachable = err?.code === "P1001" || (typeof err?.name === "string" && err.name.includes("PrismaClientKnownRequestError"));
    if (process.env.NODE_ENV === "development") {
      // Use a mild warning to avoid noisy error overlays in dev
      console.warn(isDbUnreachable ? "Database unreachable; rendering home with no boards." : "Failed to fetch boards; rendering empty list.");
    }
    boards = [];
  }

  // Smaller, stable mountain fallback for legacy boards without background
  const DEFAULT_BG = "https://images.unsplash.com/photo-1501785888041-af3ef285b470?ixlib=rb-4.0.3&w=800&q=80&auto=format";

  const normalizeUnsplash = (u: string) => {
    try {
      const url = new URL(u);
      if ((url.hostname === "images.unsplash.com" || url.hostname === "plus.unsplash.com")) {
        if (!url.searchParams.has("ixlib")) url.searchParams.set("ixlib", "rb-4.0.3");
        // Thumbnails: prefer compressed, smaller payload
        if (!url.searchParams.has("w")) url.searchParams.set("w", "800");
        if (!url.searchParams.has("q")) url.searchParams.set("q", "80");
        if (!url.searchParams.has("auto")) url.searchParams.set("auto", "format");
        return url.toString();
      }
      return u;
    } catch {
      return u;
    }
  };

  const toProxy = (u: string) => (u && u.startsWith("http") ? `/api/image-proxy?url=${encodeURIComponent(u)}` : u);

  return (
    <HomeScene isAdmin={isAdmin}>
      <main className="mx-auto max-w-5xl px-6 py-16 text-foreground">
        <h1 className="text-4xl font-bold tracking-tight">Proman</h1>
        <p className="mt-2 text-base text-foreground/70">
          Let’s visualize workflows, collaborate seamlessly and maximize efficiency! kanGFong?!
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

              boards.map((b) => {
                const raw = (b.background && b.background !== "/default-bg.jpg") ? b.background : DEFAULT_BG;
                const bgRaw = normalizeUnsplash(raw);
                const bgUrl = toProxy(bgRaw);
                return (
                  <BoardCard key={b.id} board={b} bgUrl={bgUrl} isAdmin={isAdmin} />
                );
              })
            )}
          </div>
        </section>
      </main>
    </HomeScene>
  );
}
