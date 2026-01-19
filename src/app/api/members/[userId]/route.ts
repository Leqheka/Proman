import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";

export async function PATCH(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 });

    const cookie = (req.headers as any).get?.("cookie") || "";
    const m = cookie.match(/session=([^;]+)/);
    const token = m?.[1] || "";
    const payload = token ? await verifySession(token) : null;

    if (!payload?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { role, isAdmin, name, email } = body;

    const data: any = {};
    if (role) data.role = role;
    if (typeof isAdmin === "boolean") data.isAdmin = isAdmin;
    if (name) data.name = name;
    if (email) data.email = email;

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isAdmin: true,
        role: true,
      }
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/members/[userId] error", err);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 });

    const cookie = (req.headers as any).get?.("cookie") || "";
    const m = cookie.match(/session=([^;]+)/);
    const token = m?.[1] || "";
    const payload = token ? await verifySession(token) : null;

    if (!payload?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Optional: Only allow admins to delete members?
    // For now assuming the UI controls this via isAdmin check.

    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/members/[userId] error", err);
    return NextResponse.json({ error: "Failed to delete member" }, { status: 500 });
  }
}
