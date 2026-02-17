import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ boardId: string }> }) {
  try {
    const { boardId } = await params;
    const body = await req.json();
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    if (!ids.length) return NextResponse.json({ error: "ids required" }, { status: 400 });

    // Batch update via parallel transactions is generally okay for small lists,
    // but for larger sets, raw SQL is much faster.
    // However, since list count per board is usually small (<50), 
    // we'll stick to parallel update for safety but wrap in Promise.all 
    // to ensure they are dispatched concurrently even if $transaction serializes them.
    // Actually $transaction(promises) is the correct way.
    
    // Optimization: Only update if order actually changed? 
    // For now, let's keep it simple but ensure no await inside loop.
    
    await prisma.$transaction(
      ids.map((id, idx) => prisma.list.update({ 
        where: { id }, 
        data: { order: idx } 
      }))
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/boards/:boardId/lists/reorder error", err);
    return NextResponse.json({ error: "Failed to reorder lists" }, { status: 500 });
  }
}