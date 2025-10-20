import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { boardId: string } }) {
  try {
    const lists = await prisma.list.findMany({
      where: { boardId: params.boardId },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(lists);
  } catch (err) {
    console.error("GET /api/boards/:boardId/lists error", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { boardId: string } }) {
  try {
    const body = await req.json();
    const title = (body?.title ?? "").trim();
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

    const count = await prisma.list.count({ where: { boardId: params.boardId } });
    const list = await prisma.list.create({
      data: { title, boardId: params.boardId, order: count },
    });
    return NextResponse.json(list, { status: 201 });
  } catch (err) {
    console.error("POST /api/boards/:boardId/lists error", err);
    return NextResponse.json({ error: "Failed to create list" }, { status: 500 });
  }
}