import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateTag, revalidatePath } from "next/cache";
import { verifySession } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ boardId: string }> }) {
  try {
    const { boardId } = await params;
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { lists: true },
    });
    if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(board);
  } catch (err) {
    console.error("GET /api/boards/:boardId error", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ boardId: string }> }) {
  try {
    const { boardId } = await params;
    const body = await req.json();
    const data: { title?: string; background?: string; isArchived?: boolean } = {};
    if (typeof body?.title === "string") data.title = body.title.trim();
    if (typeof body?.background === "string") data.background = body.background.trim();
    if (typeof body?.isArchived === "boolean") data.isArchived = body.isArchived;

    const board = await prisma.board.update({ where: { id: boardId }, data });
    try { 
      revalidateTag(`board:${boardId}`); 
      revalidatePath("/"); 
    } catch {}
    return NextResponse.json(board);
  } catch (err) {
    console.error("PATCH /api/boards/:boardId error", err);
    return NextResponse.json({ error: "Failed to update board" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ boardId: string }> }) {
  try {
    const cookie = (req.headers as any).get?.("cookie") || "";
    const m = cookie.match(/session=([^;]+)/);
    const token = m?.[1] || "";
    const session = token ? await verifySession(token) : null;
    if (!session?.admin) return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });

    const { boardId } = await params;
    // Instead of deleting, we archive the board
    await prisma.board.update({
      where: { id: boardId },
      data: { isArchived: true },
    });
    try { revalidateTag(`board:${boardId}`); revalidatePath("/"); } catch {}
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/boards/:boardId error", err);
    return NextResponse.json({ error: "Failed to delete board" }, { status: 500 });
  }
}