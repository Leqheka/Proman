import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";

export async function PUT(req: Request, props: { params: Promise<{ listId: string }> }) {
  const params = await props.params;
  const { listId } = params;
  const body = await req.json();
  const { dueDays, memberIds, checklist } = body;

  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  const payload = token ? await verifySession(token) : null;
  if (!payload?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify access
  const list = await prisma.list.findUnique({ where: { id: listId }, select: { boardId: true } });
  if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

  // Admin or Board Member check
  const isMember = await prisma.membership.findUnique({
    where: { userId_boardId: { userId: payload.sub, boardId: list.boardId } }
  });

  if (!payload.admin && !isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Update list
  await prisma.list.update({
    where: { id: listId },
    data: {
      defaultDueDays: dueDays,
      defaultMemberIds: memberIds ?? [],
      defaultChecklist: checklist ?? undefined,
    }
  });

  // Handle explicit null for checklist to clear it
  if (checklist === null) {
     await prisma.list.update({ where: { id: listId }, data: { defaultChecklist: Prisma.DbNull } });
  }

  return NextResponse.json({ success: true });
}
