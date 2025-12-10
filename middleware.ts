import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/")) return NextResponse.next();
  if (pathname === "/login") return NextResponse.next();
  const token = req.cookies.get("session")?.value || "";
  const payload = token ? verifySession(token) : null;
  if (!payload) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/boards/:path*", "/settings/:path*", "/api/(?!auth/:path*)"],
};
