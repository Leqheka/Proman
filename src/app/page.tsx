import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CreateBoard from "@/components/create-board";
import HomeScene from "@/components/home-scene";

export const revalidate = 60; // cache homepage data for snappier loads

export default async function Home() {
  let boards: Array<{ id: string; title: string; background: string | null }>;
  try {
    boards = await prisma.board.findMany({
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
    <HomeScene>
      <main className="mx-auto max-w-5xl px-6 py-16 text-foreground">
        <h1 className="text-4xl font-bold tracking-tight">Proman</h1>
        <p className="mt-2 text-base text-foreground/70">
          Let’s visualize workflows, collaborate seamlessly and maximize efficiency! kanGFong?!
        </p>

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Boards</h2>
            <Link href="/members" className="text-sm font-medium hover:underline text-foreground/80 hover:text-foreground">
              Manage Members
            </Link>
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
                  <div key={b.id} className="rounded-lg border border-black/10 dark:border-white/15 overflow-hidden">
                    <Link href={`/boards/${b.id}`} className="block">
                      <div
                        className="h-24"
                        style={{
                          backgroundImage: `url(${bgUrl}), linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)`,
                          backgroundSize: "cover, auto",
                          backgroundPosition: "center, center",
                        }}
                      >
                        <div className="w-full h-full bg-black/10 hover:bg-black/20 transition-colors p-4 flex items-end">
                          <p className="text-sm font-medium text-white drop-shadow">{b.title}</p>
                        </div>
                      </div>
                    </Link>
                    {/* Removed background picker thumbnails under each board tile */}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </HomeScene>
  );
}
