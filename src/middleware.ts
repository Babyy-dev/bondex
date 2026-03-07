import { NextRequest, NextResponse } from "next/server";
import { verifySession, COOKIE } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protected hotel routes
  if (pathname.startsWith("/hotel/orders") || pathname.startsWith("/hotel/scan")) {
    const token = req.cookies.get(COOKIE)?.value;
    if (!token) return NextResponse.redirect(new URL("/hotel/login", req.url));
    const session = await verifySession(token);
    if (!session || session.role !== "hotel") {
      return NextResponse.redirect(new URL("/hotel/login", req.url));
    }
  }

  // Protected admin routes
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = req.cookies.get(COOKIE)?.value;
    if (!token) return NextResponse.redirect(new URL("/hotel/login", req.url));
    const session = await verifySession(token);
    if (!session) return NextResponse.redirect(new URL("/hotel/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/hotel/orders/:path*", "/hotel/scan/:path*", "/admin/:path*"],
};
