import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { verifySession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const token = (req.headers as any).get?.("cookie")?.match(/session=([^;]+)/)?.[1] || "";
    const session = token ? await verifySession(token) : null;
    if (!session?.admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const body = await req.json();
    const identifier = (body?.identifier ?? "").trim();
    const newPassword = (body?.newPassword ?? "").trim();
    if (!identifier || !newPassword) return NextResponse.json({ error: "identifier and newPassword required" }, { status: 400 });
    const user = await prisma.user.findFirst({ where: { OR: [{ email: identifier }, { username: identifier }, { id: identifier }] } });
    if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });
    if (user.isAdmin) return NextResponse.json({ error: "Cannot reset password for an admin user" }, { status: 403 });
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(newPassword) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

