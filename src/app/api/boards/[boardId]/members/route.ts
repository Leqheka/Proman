import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { verifySession } from "@/lib/session";

// List board members
export async function GET(req: Request, { params }: { params: Promise<{ boardId: string }> }) {
  try {
    const cookie = (req.headers as any).get?.("cookie") || "";
    const m = cookie.match(/session=([^;]+)/);
    const token = m?.[1] || "";
    const payload = token ? await verifySession(token) : null;
    const { boardId } = await params;
    if (!boardId) return NextResponse.json({ error: "boardId required" }, { status: 400 });
    if (!payload?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const isMember = await prisma.membership.findUnique({
      where: { userId_boardId: { userId: payload.sub as string, boardId } },
      select: { userId: true },
    });
    if (!isMember && !payload?.admin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const memberships = await prisma.membership.findMany({
      where: { boardId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { role: "asc" },
    });
    const members = memberships.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
      role: m.role,
    }));
    return NextResponse.json(members);
  } catch (err) {
    console.error("GET /api/boards/[boardId]/members error", err);
    const msg = err instanceof Error ? err.message : "Failed to list members";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Add/register a new member to the board
export async function POST(req: Request, { params }: { params: Promise<{ boardId: string }> }) {
  try {
    const cookie = (req.headers as any).get?.("cookie") || "";
    const m = cookie.match(/session=([^;]+)/);
    const token = m?.[1] || "";
    const payload = token ? await verifySession(token) : null;
    if (!payload?.admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const { boardId } = await params;
    let email = "";
    let name: string | undefined = undefined;
    let role: string | undefined = undefined;

    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const body = await req.json();
      email = String(body?.email ?? "").trim();
      name = typeof body?.name === "string" ? body.name.trim() : undefined;
      role = typeof body?.role === "string" ? body.role : undefined;
    } else {
      const fd = await req.formData();
      email = String(fd.get("email") ?? "").trim();
      name = String(fd.get("name") ?? "").trim() || undefined;
      role = String(fd.get("role") ?? "").trim() || undefined;
    }

    if (!boardId) return NextResponse.json({ error: "boardId required" }, { status: 400 });
    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

    let user;
    try {
      user = await prisma.user.upsert({
        where: { email },
        update: { name },
        create: { email, name },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: `user upsert failed: ${msg}` }, { status: 500 });
    }

    let membership;
    try {
      membership = await prisma.membership.upsert({
        where: { userId_boardId: { userId: user.id, boardId } },
        update: { role: (role as any) ?? undefined },
        create: { userId: user.id, boardId, role: (role as any) ?? "EDITOR" },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: `membership upsert failed: ${msg}` }, { status: 500 });
    }

    const response = NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: membership.role,
    }, { status: 201 });
    try { revalidateTag(`board:${boardId}`); } catch {}
    return response;
  } catch (err) {
    console.error("POST /api/boards/[boardId]/members error", err);
    const msg = err instanceof Error ? err.message : "Failed to add member";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
