import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const origName = (file as any).name || `avatar`;
    const extFromType = (() => {
      const t = file.type || "";
      if (t.includes("png")) return ".png";
      if (t.includes("jpeg") || t.includes("jpg")) return ".jpg";
      if (t.includes("gif")) return ".gif";
      return path.extname(origName) || ".bin";
    })();
    const filename = `avatar${extFromType}`;

    const isProd = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
    const supaUrl = process.env.SUPABASE_URL;
    const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supaBucket = process.env.SUPABASE_BUCKET || "uploads";

    if (supaUrl && supaKey) {
      const client = createClient(supaUrl, supaKey);
      const pathInBucket = `users/${userId}/${filename}`;
      const { error: upErr } = await client.storage.from(supaBucket).upload(pathInBucket, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });
      if (upErr) {
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
      }
      const { data: pub } = client.storage.from(supaBucket).getPublicUrl(pathInBucket);
      const publicUrl = pub.publicUrl || `https://supabase.storage/${supaBucket}/${pathInBucket}`;
      await prisma.user.update({ where: { id: userId }, data: { image: publicUrl } });
      return NextResponse.json({ image: publicUrl }, { status: 201 });
    }

    if (process.env.VERCEL) {
      // Fallback to Base64 Data URI if no external storage is configured on Vercel
      if (buffer.length > 2 * 1024 * 1024) { // 2MB limit
        return NextResponse.json({ error: "Image too large for inline storage (max 2MB)" }, { status: 400 });
      }
      const mime = file.type || "application/octet-stream";
      const base64 = buffer.toString("base64");
      const dataUri = `data:${mime};base64,${base64}`;
      await prisma.user.update({ where: { id: userId }, data: { image: dataUri } });
      return NextResponse.json({ image: dataUri }, { status: 201 });
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "users", userId);
    await fs.promises.mkdir(uploadsDir, { recursive: true });
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