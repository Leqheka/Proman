import { prisma } from "@/lib/prisma";
import MembersClient from "./members-client";

export default async function BoardMembersPage({ params }: { params: { boardId: string } }) {
  const { boardId } = params;
  let boardTitle = "Board";
  let ownerId: string | undefined = undefined;
  let members: Array<{ id: string; name?: string | null; email: string; role: string }> = [];
  try {
    const board = await prisma.board.findUnique({ where: { id: boardId }, select: { title: true, ownerId: true } });
    boardTitle = board?.title ?? boardTitle;
    ownerId = board?.ownerId ?? undefined;
    const memberships = await prisma.membership.findMany({
      where: { boardId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { role: "asc" },
    });
    members = memberships.map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email, role: m.role }));
  } catch {}

  return <MembersClient boardId={boardId} boardTitle={boardTitle} initialMembers={members} ownerId={ownerId} />;
}