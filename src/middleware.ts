import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

const COOKIE = "bondex_session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminPath = pathname.startsWith("/admin");
  const isHotelProtected =
    pathname.startsWith("/hotel/orders") ||
    pathname.startsWith("/hotel/scan");

  if (!isAdminPath && !isHotelProtected) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/hotel/login", req.url));
  }

  const session = await verifySession(token);
  if (!session) {
    // Clear stale/invalid cookie and redirect to login
    const res = NextResponse.redirect(new URL("/hotel/login", req.url));
    res.cookies.delete(COOKIE);
    return res;
  }

  // Admin routes require the admin role
  if (isAdminPath && session.role !== "admin") {
    return NextResponse.redirect(new URL("/hotel/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/hotel/orders/:path*",
    "/hotel/scan/:path*",
    "/admin/:path*",
  ],
};
