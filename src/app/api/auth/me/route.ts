// app/api/auth/me/route.ts - UPDATED
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = "session";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    
    if (!token) {
      // No token means not authenticated, but don't clear anything
      return NextResponse.json({ 
        user: null,
        error: "No session token"
      });
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(JWT_SECRET)
    );

    // Return the same user data structure as login
    const userData = {
      id: payload.id as number,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as string,
      kycStatus: payload.kycStatus as string,
    };

    return NextResponse.json({ 
      user: userData 
    });
  } catch (error) {
    console.error("JWT verification failed:", error);
    
    // Don't clear the cookie automatically on error pages
    // Only return that there's no valid session
    return NextResponse.json({ 
      user: null,
      error: "Invalid or expired session"
    });
    
    // Remove this part that clears cookies:
    // const response = NextResponse.json({ user: null });
    // response.cookies.delete(COOKIE_NAME);
    // return response;
  }
}