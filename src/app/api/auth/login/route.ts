// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db"; // your Drizzle + Turso client
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = "session";

// Removed the old setCookie function - we'll create response inline

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  // 1. Find user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // 2. Check password
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // 3. Prepare user data for JWT and response
  const userData = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    kycStatus: user.kycStatus,
  };

  // 4. Create JWT
  const jwt = await new SignJWT({ ...userData })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(JWT_SECRET));

  // 5. Create response with user data AND set cookie
  const response = NextResponse.json({ 
    success: true, 
    user: userData  // 👈 THIS IS CRITICAL for Zustand
  });
  
  // Set the JWT as an HTTP-only cookie
  response.cookies.set({
    name: COOKIE_NAME,
    value: jwt,
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60, // 1 hour in seconds
  });
  
  return response;
}