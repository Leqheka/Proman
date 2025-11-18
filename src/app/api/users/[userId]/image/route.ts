import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "users", userId);
    await fs.promises.mkdir(uploadsDir, { recursive: true });

    const origName = (file as any).name || `avatar`;
    const extFromType = (() => {
      const t = file.type || "";
      if (t.includes("png")) return ".png";
      if (t.includes("jpeg") || t.includes("jpg")) return ".jpg";
      if (t.includes("gif")) return ".gif";
      return path.extname(origName) || ".bin";
    })();
    const filename = `avatar${extFromType}`;
    const filePath = path.join(uploadsDir, filename);

    await fs.promises.writeFile(filePath, buffer);

    const publicUrl = `/uploads/users/${userId}/${filename}`;
    await prisma.user.update({ where: { id: userId }, data: { image: publicUrl } });

    return NextResponse.json({ image: publicUrl }, { status: 201 });
  } catch (err) {
    console.error("POST /api/users/[userId]/image error", err);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}