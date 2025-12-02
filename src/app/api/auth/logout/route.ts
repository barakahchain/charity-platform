// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

const COOKIE_NAME = "session";

export async function POST() {
  const res = NextResponse.json({ 
    success: true,
    message: "Logged out successfully" 
  });
  
  // Clear the session cookie
  res.cookies.set({
    name: COOKIE_NAME,
    value: "",
    path: "/",
    expires: new Date(0), // Expire immediately
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  
  return res;
}

export async function GET() {
  return POST(); // Allow GET for convenience
}