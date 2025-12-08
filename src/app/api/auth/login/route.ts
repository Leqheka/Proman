import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, signSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identifier = (body?.identifier ?? "").trim();
    const password = (body?.password ?? "").trim();
    if (!identifier || !password) return NextResponse.json({ error: "identifier and password required" }, { status: 400 });

    const user = await prisma.user.findFirst({ where: { OR: [{ email: identifier }, { username: identifier }] } });
    if (!user || !user.passwordHash) return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
    const ok = verifyPassword(password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "invalid credentials" }, { status: 401 });

    const token = signSession({ sub: user.id, email: user.email, username: user.username, admin: user.isAdmin });
    const res = NextResponse.json({ ok: true });
    res.headers.set("Set-Cookie", `session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`);
    return res;
  } catch (err) {
    return NextResponse.json({ error: "login failed" }, { status: 500 });
  }
}

