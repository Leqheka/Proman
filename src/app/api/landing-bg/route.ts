import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const exact = await prisma.board.findFirst({ where: { title: { equals: "Preview Test Board", mode: "insensitive" } }, select: { background: true } });
    const both = !exact?.background ? await prisma.board.findFirst({ where: { AND: [{ title: { contains: "Preview", mode: "insensitive" } }, { title: { contains: "Test", mode: "insensitive" } }] }, select: { background: true } }) : null;
    const latest = !exact?.background && !both?.background ? await prisma.board.findFirst({ where: { background: { not: null } }, orderBy: { updatedAt: "desc" }, select: { background: true } }) : null;
    const url = exact?.background || both?.background || latest?.background || "https://images.unsplash.com/photo-1528164344705-475426870aed?w=1600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3";
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ url: "https://images.unsplash.com/photo-1528164344705-475426870aed?w=1600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3" });
  }
}

