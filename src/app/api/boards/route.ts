import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const cookie = (req.headers as any).get?.("cookie") || "";
    const m = cookie.match(/session=([^;]+)/);
    const token = m?.[1] || "";
    const payload = token ? await verifySession(token) : null;
    if (!payload?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const isAdmin = payload.admin === true;

    const boards = await prisma.board.findMany({
      where: isAdmin ? {} : {
        OR: [
          { ownerId: payload.sub as string },
          { members: { some: { userId: payload.sub as string } } }
        ]
      },
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
    const cookie = (req.headers as any).get?.("cookie") || "";
    const m = cookie.match(/session=([^;]+)/);
    const token = m?.[1] || "";
    const payload = token ? await verifySession(token) : null;
    if (!payload?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const title = (body?.title ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Use a stable mountain image; ixlib added to avoid Unsplash 403s
    const DEFAULT_BG = "https://images.unsplash.com/photo-1528164344705-475426870aed?w=1600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3";
    const board = await prisma.board.create({
      data: { title, ownerId: payload.sub as string, background: DEFAULT_BG },
    });
    return NextResponse.json(board, { status: 201 });
  } catch (err) {
    console.error("POST /api/boards error", err);
    return NextResponse.json({ error: "Failed to create board" }, { status: 500 });
  }
}