import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const origName = (file as any).name || "file";
    // Sanitize filename
    const safeName = origName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${Date.now()}-${safeName}`;

    const supaUrl = process.env.SUPABASE_URL;
    const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supaBucket = process.env.SUPABASE_BUCKET || "uploads";

    if (supaUrl && supaKey) {
      const client = createClient(supaUrl, supaKey);
      const pathInBucket = `files/${filename}`;
      const { error: upErr } = await client.storage.from(supaBucket).upload(pathInBucket, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });
      if (upErr) {
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
      }
      const { data: pub } = client.storage.from(supaBucket).getPublicUrl(pathInBucket);
      const publicUrl = pub.publicUrl || `https://supabase.storage/${supaBucket}/${pathInBucket}`;
      return NextResponse.json({ url: publicUrl, filename: origName, type: file.type, size: file.size }, { status: 201 });
    }

    if (process.env.VERCEL) {
       // Vercel doesn't support persistent local storage. 
       // If no Supabase, we can only support small files via Data URI or fail.
       // Let's support small files via Data URI for demo purposes if < 4MB
       if (buffer.length > 4 * 1024 * 1024) {
         return NextResponse.json({ error: "File too large for inline storage (max 4MB). Configure Supabase for larger files." }, { status: 400 });
       }
       const mime = file.type || "application/octet-stream";
       const base64 = buffer.toString("base64");
       const dataUri = `data:${mime};base64,${base64}`;
       return NextResponse.json({ url: dataUri, filename: origName, type: file.type, size: file.size }, { status: 201 });
    }

    // Local development
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "files");
    await fs.promises.mkdir(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(filePath, buffer);
    const publicUrl = `/uploads/files/${filename}`;
    
    return NextResponse.json({ url: publicUrl, filename: origName, type: file.type, size: file.size }, { status: 201 });
  } catch (err) {
    console.error("POST /api/files error", err);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
