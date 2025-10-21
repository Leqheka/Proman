import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: Promise<{ cardId: string; attachmentId: string }> }) {
  try {
    const { attachmentId } = await params;
    if (!attachmentId) return NextResponse.json({ error: "attachmentId required" }, { status: 400 });

    await prisma.attachment.delete({ where: { id: attachmentId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/cards/[cardId]/attachments/[attachmentId] error", err);
    return NextResponse.json({ error: "Failed to remove attachment" }, { status: 500 });
  }
}