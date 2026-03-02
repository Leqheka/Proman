import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
import { cookies } from "next/headers";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value || "";
    const session = token ? await verifySession(token) : null;

    if (!session?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updated = await prisma.notification.updateMany({
      where: { id, userId: session.sub as string },
      data: { read: true },
    });

    return NextResponse.json({ success: true, count: updated.count });
  } catch (err) {
    console.error("PATCH /api/notifications/[id] error", err);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
