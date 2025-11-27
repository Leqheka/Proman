import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";

// Remove a member from the board
export async function DELETE(_req: Request, { params }: { params: Promise<{ boardId: string; userId: string }> }) {
  try {
    const { boardId, userId } = await params;
    if (!boardId || !userId) return NextResponse.json({ error: "boardId and userId required" }, { status: 400 });

    try {
      await prisma.membership.delete({ where: { userId_boardId: { userId, boardId } } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: `membership delete failed: ${msg}` }, { status: 500 });
    }
    try { revalidateTag(`board:${boardId}`); } catch {}
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/boards/[boardId]/members/[userId] error", err);
    const msg = err instanceof Error ? err.message : "Failed to remove member";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Update a member's role
export async function PATCH(req: Request, { params }: { params: Promise<{ boardId: string; userId: string }> }) {
  try {
    const { boardId, userId } = await params;
    let role = "";
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const body = await req.json();
      role = String(body?.role ?? "");
    } else {
      const fd = await req.formData();
      role = String(fd.get("role") ?? "");
    }
    if (!boardId || !userId) return NextResponse.json({ error: "boardId and userId required" }, { status: 400 });
    if (!role) return NextResponse.json({ error: "role required" }, { status: 400 });

    let updated;
    try {
      updated = await prisma.membership.update({
        where: { userId_boardId: { userId, boardId } },
        data: { role: role as any },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: `membership update failed: ${msg}` }, { status: 500 });
    }
    try { revalidateTag(`board:${boardId}`); } catch {}
    return NextResponse.json({ ok: true, role: updated.role });
  } catch (err) {
    console.error("PATCH /api/boards/[boardId]/members/[userId] error", err);
    const msg = err instanceof Error ? err.message : "Failed to update role";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Method override for HTML forms: POST with _method=DELETE|PATCH
export async function POST(req: Request, ctx: { params: Promise<{ boardId: string; userId: string }> }) {
  const { boardId, userId } = await ctx.params;
  const fd = await req.formData();
  const method = String(fd.get("_method") ?? "").toUpperCase();
  if (method === "DELETE") {
    return DELETE(req, ctx as any);
  }
  if (method === "PATCH") {
    return PATCH(req, ctx as any);
  }
  return NextResponse.json({ error: "Unsupported _method" }, { status: 400 });
}