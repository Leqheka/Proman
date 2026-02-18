import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Optimize image using sharp
    let finalBuffer: Buffer;
    try {
      finalBuffer = await sharp(buffer)
        .resize(500, 500, {
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: 80 })
        .toBuffer();
    } catch (e) {
      console.error("Image processing error:", e);
      return NextResponse.json({ error: "Failed to process image" }, { status: 400 });
    }

    const filename = `avatar.webp`;
    const mimeType = "image/webp";

    const isProd = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
    const supaUrl = process.env.SUPABASE_URL;
    const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supaBucket = process.env.SUPABASE_BUCKET || "uploads";

    if (supaUrl && supaKey) {
      const client = createClient(supaUrl, supaKey);
      const pathInBucket = `users/${userId}/${filename}`;
      const { error: upErr } = await client.storage.from(supaBucket).upload(pathInBucket, finalBuffer, {
        contentType: mimeType,
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
      if (finalBuffer.length > 2 * 1024 * 1024) { // 2MB limit
        return NextResponse.json({ error: "Image too large for inline storage (max 2MB)" }, { status: 400 });
      }
      const base64 = finalBuffer.toString("base64");
      const dataUri = `data:${mimeType};base64,${base64}`;
      await prisma.user.update({ where: { id: userId }, data: { image: dataUri } });
      return NextResponse.json({ image: dataUri }, { status: 201 });
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "users", userId);
    await fs.promises.mkdir(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(filePath, finalBuffer);
    const publicUrl = `/uploads/users/${userId}/${filename}`;
    await prisma.user.update({ where: { id: userId }, data: { image: publicUrl } });
    return NextResponse.json({ image: publicUrl }, { status: 201 });
  } catch (err) {
    console.error("POST /api/users/[userId]/image error", err);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
