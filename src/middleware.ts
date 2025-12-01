import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = "session";

export async function middleware(req: NextRequest) {
  const tokenCookie = req.cookies.get(COOKIE_NAME)?.value;
  const { pathname } = req.nextUrl;

  // Define which paths are protected
  const protectedPaths = ["/dashboard", "/projects/create"]; // example

  if (protectedPaths.some((p) => pathname.startsWith(p))) {
    if (!tokenCookie) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
      await jwtVerify(tokenCookie, new TextEncoder().encode(JWT_SECRET));
      // valid token → let through
      return NextResponse.next();
    } catch (e) {
      // invalid or expired token
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/projects/create"], // or more
};
