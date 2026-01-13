import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";

export async function PUT(req: Request, props: { params: Promise<{ listId: string }> }) {
  const params = await props.params;
  const { listId } = params;
  const body = await req.json();
  const { dueDays, memberIds, checklists } = body;

  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
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

  try {
    // Update list
    const data: Prisma.ListUpdateInput = {
      defaultDueDays: dueDays,
      defaultMemberIds: memberIds ?? [],
    };

    if (checklists !== undefined) {
      // If checklists is null or empty array, clear it
      if (checklists === null || (Array.isArray(checklists) && checklists.length === 0)) {
        data.defaultChecklist = Prisma.DbNull; // Use DbNull for explicit DB NULL if needed, or null
      } else {
        // Ensure it's a valid JSON value (array)
        data.defaultChecklist = checklists as Prisma.InputJsonValue;
      }
    }

    await prisma.list.update({
      where: { id: listId },
      data,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT /api/lists/:listId/defaults error", err);
    return NextResponse.json({ error: (err as Error).message || "Database error" }, { status: 500 });
  }
}
