import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const boards = await prisma.board.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(boards);
  } catch (err) {
    console.error("GET /api/boards error", err);
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const title = (body?.title ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    let ownerId: string | undefined = body?.ownerId;

    // Temporary: upsert a placeholder user if none provided (until auth is wired)
    if (!ownerId) {
      const user = await prisma.user.upsert({
        where: { email: "placeholder@local" },
        update: {},
        create: { email: "placeholder@local", name: "Placeholder" },
      });
      ownerId = user.id;
    }

    // Use a stable mountain image; ixlib added to avoid Unsplash 403s
    const DEFAULT_BG = "https://images.unsplash.com/photo-1528164344705-475426870aed?w=1600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3";
    const board = await prisma.board.create({
      data: { title, ownerId, background: DEFAULT_BG },
    });
    return NextResponse.json(board, { status: 201 });
  } catch (err) {
    console.error("POST /api/boards error", err);
    return NextResponse.json({ error: "Failed to create board" }, { status: 500 });
  }
}