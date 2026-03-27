import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PASSWORD = "INDIGO!APEX!2026";
const COOKIE_NAME = "apex_auth";

export function proxy(req: NextRequest) {
  // Skip API routes and static assets
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Check auth cookie
  const cookie = req.cookies.get(COOKIE_NAME);
  if (cookie?.value === PASSWORD) {
    return NextResponse.next();
  }

  // Check POST login
  if (req.method === "POST") {
    return NextResponse.next();
  }

  // Redirect to login
  if (pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
