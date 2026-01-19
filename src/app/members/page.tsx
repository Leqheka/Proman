import { prisma } from "@/lib/prisma";
import MembersClient from "./members-client";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function MembersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value || "";
  const payload = token ? await verifySession(token) : null;
  
  if (!payload?.sub) {
    redirect("/"); // Or login page if exists, but home is fine for now
  }

  const currentUserAdmin = !!payload?.admin;

  let members: Array<{ id: string; name?: string | null; email: string; image?: string | null; isAdmin: boolean; role: string }> = [];
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, image: true, isAdmin: true, role: true },
      orderBy: { name: "asc" },
    });
    members = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      isAdmin: u.isAdmin,
      role: u.role,
    }));
  } catch (err) {
    console.error("Failed to load members", err);
  }

  return <MembersClient initialMembers={members} currentUserAdmin={currentUserAdmin} />;
}
