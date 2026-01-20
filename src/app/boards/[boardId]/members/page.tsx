import { prisma } from "@/lib/prisma";
import MembersClient from "./members-client";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function BoardMembersPage({ params }: { params: { boardId: string } }) {
  const { boardId } = params;
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value || "";
  const payload = token ? await verifySession(token) : null;
  const isAdmin = !!payload?.admin;
  if (!isAdmin) redirect(`/boards/${boardId}`);
  let boardTitle = "Board";
  let ownerId: string | undefined = undefined;
  let members: Array<{ id: string; name?: string | null; email: string; role: string; isAdmin?: boolean }> = [];
  try {
    const board = await prisma.board.findUnique({ where: { id: boardId }, select: { title: true, ownerId: true } });
    boardTitle = board?.title ?? boardTitle;
    ownerId = board?.ownerId ?? undefined;
    const memberships = await prisma.membership.findMany({
      where: { boardId },
      include: { user: { select: { id: true, name: true, email: true, isAdmin: true } } },
      orderBy: { role: "asc" },
    });
    members = memberships.map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email, role: m.role, isAdmin: m.user.isAdmin }));
  } catch {}

  return <MembersClient boardId={boardId} boardTitle={boardTitle} initialMembers={members} ownerId={ownerId} isAdmin={isAdmin} />;
}
