import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { signSession } from "@/lib/session";
import { bumpAndCheck } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identifier = (body?.identifier ?? "").trim();
    const password = (body?.password ?? "").trim();
    if (!identifier || !password) return NextResponse.json({ error: "identifier and password required" }, { status: 400 });

    const ip = (req.headers as any).get?.("x-forwarded-for") || "unknown";
    const allowed = await bumpAndCheck("login", `${identifier}:${ip}`, 5, 60);
    if (!allowed) return NextResponse.json({ error: "too many attempts" }, { status: 429 });

    const user = await prisma.user.findFirst({ where: { OR: [{ email: identifier }, { username: identifier }] } });
    if (!user || !user.passwordHash) {
      await prisma.activity.create({ data: { type: "LOGIN_FAILED", details: { identifier }, userId: null } as any });
      return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
    }
    const ok = verifyPassword(password, user.passwordHash);
    if (!ok) {
      await prisma.activity.create({ data: { type: "LOGIN_FAILED", details: { identifier }, userId: user.id } as any });
      return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
    }

    const token = await signSession({ sub: user.id, email: user.email, username: user.username, admin: user.isAdmin });
    await prisma.activity.create({ data: { type: "LOGIN_SUCCESS", details: { identifier }, userId: user.id } as any });
    const res = NextResponse.json({ ok: true });
    res.headers.set("Set-Cookie", `session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`);
    return res;
  } catch (err) {
    return NextResponse.json({ error: "login failed" }, { status: 500 });
  }
}
