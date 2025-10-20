import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const data: { title?: string; background?: string } = {};
    if (typeof body?.title === "string") data.title = body.title.trim();
    if (typeof body?.background === "string") data.background = body.background.trim();

    const board = await prisma.board.update({ where: { id: boardId }, data });
    return NextResponse.json(board);
  } catch (err) {
    console.error("PATCH /api/boards/:boardId error", err);
    return NextResponse.json({ error: "Failed to update board" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ boardId: string }> }) {
  try {
    const { boardId } = await params;
    await prisma.board.delete({ where: { id: boardId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/boards/:boardId error", err);
    return NextResponse.json({ error: "Failed to delete board" }, { status: 500 });
  }
}