import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { boardId: string } }) {
  try {
    const board = await prisma.board.findUnique({
      where: { id: params.boardId },
      include: { lists: true },
    });
    if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(board);
  } catch (err) {
    console.error("GET /api/boards/:boardId error", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { boardId: string } }) {
  try {
    const body = await req.json();
    const data: { title?: string; background?: string } = {};
    if (typeof body?.title === "string") data.title = body.title.trim();
    if (typeof body?.background === "string") data.background = body.background.trim();

    const board = await prisma.board.update({ where: { id: params.boardId }, data });
    return NextResponse.json(board);
  } catch (err) {
    console.error("PATCH /api/boards/:boardId error", err);
    return NextResponse.json({ error: "Failed to update board" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { boardId: string } }) {
  try {
    await prisma.board.delete({ where: { id: params.boardId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/boards/:boardId error", err);
    return NextResponse.json({ error: "Failed to delete board" }, { status: 500 });
  }
}