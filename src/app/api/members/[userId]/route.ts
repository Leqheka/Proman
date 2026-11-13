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

    if (payload.sub === userId) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }

    // Use a transaction to clean up or reassign all related records before deleting the user
    await prisma.$transaction([
      // 1. Reassign any boards owned by this user to the admin performing the deletion
      prisma.board.updateMany({
        where: { ownerId: userId },
        data: { ownerId: payload.sub as string }
      }),
      // 2. Delete user-specific records that shouldn't be reassigned
      prisma.membership.deleteMany({ where: { userId } }),
      prisma.cardAssignment.deleteMany({ where: { userId } }),
      prisma.notification.deleteMany({ where: { userId } }),
      
      // 3. Reassign content created by this user to preserve history
      prisma.comment.updateMany({
        where: { userId },
        data: { userId: payload.sub as string }
      }),
      prisma.activity.updateMany({
        where: { userId },
        data: { userId: payload.sub as string }
      }),
      // 4. Finally, delete the user
      prisma.user.delete({ where: { id: userId } })
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/members/[userId] error", err);
    return NextResponse.json({ error: "Failed to delete member" }, { status: 500 });
  }
}
