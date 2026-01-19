import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const cookie = (req.headers as any).get?.("cookie") || "";
    const m = cookie.match(/session=([^;]+)/);
    const token = m?.[1] || "";
    const payload = token ? await verifySession(token) : null;
    
    // Ensure user is authenticated
    if (!payload?.sub) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Fetch all users (workspace members)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isAdmin: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(users);
  } catch (err) {
    console.error("GET /api/members error", err);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookie = (req.headers as any).get?.("cookie") || "";
    const m = cookie.match(/session=([^;]+)/);
    const token = m?.[1] || "";
    const payload = token ? await verifySession(token) : null;

    // Only admins should create new members globally (optional, but good practice)
    // For now, checking if authenticated as this is an internal tool vibe
    if (!payload?.sub) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { email, name, isAdmin } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Upsert user to ensure they exist
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: name || undefined,
        isAdmin: isAdmin ?? undefined,
      },
      create: {
        email,
        name,
        isAdmin: isAdmin ?? false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isAdmin: true,
      }
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    console.error("POST /api/members error", err);
    return NextResponse.json({ error: "Failed to create member" }, { status: 500 });
  }
}
