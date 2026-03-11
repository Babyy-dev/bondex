import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "bondex_session";

function getSecret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET not set");
  return new TextEncoder().encode(s);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public paths — never block
  if (
    pathname === "/hotel/login" ||
    pathname === "/admin/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/stripe/webhook")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE)?.value;

  // ── Hotel staff routes ───────────────────────────────────────────────────
  if (pathname.startsWith("/hotel") || pathname.startsWith("/api/hotels")) {
    if (!token) return NextResponse.redirect(new URL("/hotel/login", req.url));
    try {
      const { payload } = await jwtVerify(token, getSecret());
      if (payload.role !== "hotel" && payload.role !== "admin") {
        return NextResponse.redirect(new URL("/hotel/login", req.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/hotel/login", req.url));
    }
  }

  // ── Admin routes ─────────────────────────────────────────────────────────
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!token) return NextResponse.redirect(new URL("/admin/login", req.url));
    try {
      const { payload } = await jwtVerify(token, getSecret());
      if (payload.role !== "admin") {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/hotel/:path*", "/admin/:path*", "/api/hotels/:path*", "/api/admin/:path*"],
};
