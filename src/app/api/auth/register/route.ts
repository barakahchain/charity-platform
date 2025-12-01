// app/api/register/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = "session";

// Reusable helper (same behavior as login)
function setSessionCookie(token: string, user: any) {
  const res = NextResponse.json({
    message: "Registration successful.",
    user,
  });

  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

//   console.log("Set session cookie for user:", user.email);

  return res;
}

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    // Check existing user
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 12);

    // Insert user
    const [inserted] = await db
      .insert(users)
      .values({
        name,
        email,
        password: hashed,
        role: "donor",
        createdAt: new Date().toISOString(),
      })
      .returning();

    //   console.log("New user registered:", inserted.email);

    // Create JWT
    const token = await new SignJWT({
      userId: inserted.id,
      name: inserted.name,
      role: inserted.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(JWT_SECRET));

    //   console.log("Generated JWT for new user:", inserted.email);

    // Auto-login user
    return setSessionCookie(token, {
      id: inserted.id,
      name: inserted.name,
      email: inserted.email,
      role: inserted.role,
    });
    

  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
