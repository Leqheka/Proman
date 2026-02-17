import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();
  if (pathname === "/login") return NextResponse.next();
  
  const token = req.cookies.get("session")?.value || "";
  const payload = token ? await verifySession(token) : null;
  
  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (API routes)
     * - api/landing-bg (Landing page background)
     * - _next (static files, image optimization, internal Next.js requests)
     * - favicon.ico (favicon file)
     * - login (login page)
     */
    '/((?!api/auth|api/landing-bg|_next|favicon.ico|login).*)',
  ],
};
