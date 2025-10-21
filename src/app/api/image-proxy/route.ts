import { NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set([
  "images.unsplash.com",
  "plus.unsplash.com",
  "picsum.photos",
]);

function isAllowed(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    return ALLOWED_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

function fallbackSvg() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#a7c5eb"/>
      <stop offset="100%" stop-color="#d5e1ef"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#g)"/>
  <g fill="#000000" fill-opacity="0.35">
    <rect x="0" y="0" width="1600" height="900"/>
  </g>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="52" font-family="system-ui, -apple-system, Segoe UI, Roboto">Image unavailable</text>
</svg>`;
  return new NextResponse(svg, {
    status: 200,
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=300",
      "x-proxy": "image-fallback",
    },
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("url");
    const url = raw ? decodeURIComponent(raw) : null; // decode because client encodes the param
    if (!url || !isAllowed(url)) {
      return NextResponse.json({ error: "Invalid or disallowed URL" }, { status: 400 });
    }

    const upstream = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": new URL(url).origin + "/",
      },
      cache: "no-store",
      redirect: "follow",
    });

    if (!upstream.ok) {
      return fallbackSvg();
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const buf = await upstream.arrayBuffer();
    return new NextResponse(Buffer.from(buf), {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=3600",
        "x-proxy": "image",
      },
    });
  } catch (err) {
    return fallbackSvg();
  }
}