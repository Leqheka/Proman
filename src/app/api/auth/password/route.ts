import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/auth";

export async function PATCH(req: Request) {
  try {
    const token = (req.headers as any).get?.("cookie")?.match(/session=([^;]+)/)?.[1] || "";
    const session = token ? verifySession(token) : null;
    if (!session?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const body = await req.json();
    const current = (body?.currentPassword ?? "").trim();
    const next = (body?.newPassword ?? "").trim();
    if (!current || !next) return NextResponse.json({ error: "currentPassword and newPassword required" }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { id: session.sub } });
    if (!user || !user.passwordHash || !verifyPassword(current, user.passwordHash)) return NextResponse.json({ error: "invalid current password" }, { status: 400 });
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(next) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

