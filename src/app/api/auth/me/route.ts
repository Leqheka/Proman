import { NextResponse } from "next/server";
import { verifySession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value || "";
    const payload = token ? await verifySession(token) : null;
    if (!payload?.sub) return NextResponse.json({ loggedIn: false }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { id: payload.sub as string }, select: { id: true, email: true, username: true, name: true, image: true, isAdmin: true } });
    return NextResponse.json({ loggedIn: true, user });
  } catch {
    return NextResponse.json({ loggedIn: false }, { status: 401 });
  }
}

