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
    const user = await prisma.user.findUnique({ where: { id: payload.sub as string }, select: { id: true, email: true, username: true, name: true, image: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const cookie = (req.headers as any).get?.("cookie") || "";
    const m = cookie.match(/session=([^;]+)/);
    const token = m?.[1] || "";
    const payload = token ? await verifySession(token) : null;
    if (!payload?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : undefined;
    const username = typeof body?.username === "string" ? body.username.trim() : undefined;
    const email = typeof body?.email === "string" ? body.email.trim() : undefined;
    const data: any = {};
    if (name !== undefined) data.name = name || null;
    if (username !== undefined) data.username = username || null;
    if (email !== undefined) data.email = email;
    const updated = await prisma.user.update({ where: { id: payload.sub as string }, data });
    return NextResponse.json({ ok: true, user: { id: updated.id, email: updated.email, username: updated.username, name: updated.name, image: updated.image } });
  } catch (e: any) {
    if (e.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

