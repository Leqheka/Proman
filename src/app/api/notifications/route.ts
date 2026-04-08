import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value || "";
    const session = token ? await verifySession(token) : null;

    if (!session?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: session.sub as string },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json(notifications);
  } catch (err) {
    console.error("GET /api/notifications error", err);
    return NextResponse.json({ error: "Failed to list notifications" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "all";

    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value || "";
    const session = token ? await verifySession(token) : null;

    if (!session?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (type === "read") {
      await prisma.notification.deleteMany({
        where: { userId: session.sub as string, read: true },
      });
    } else {
      await prisma.notification.deleteMany({
        where: { userId: session.sub as string },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/notifications error", err);
    return NextResponse.json({ error: "Failed to delete notifications" }, { status: 500 });
  }
}
