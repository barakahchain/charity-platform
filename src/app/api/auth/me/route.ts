// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = "session";

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie");
  if (!cookie) {
    return NextResponse.json({ user: null });
  }

  const match = cookie
    .split("; ")
    .find((c) => c.startsWith(COOKIE_NAME + "="));

  if (!match) {
    return NextResponse.json({ user: null });
  }

  const token = match.split("=")[1];
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET));
    return NextResponse.json({ user: { id: payload.userId, name: payload.name, role: payload.role } });
  } catch (e) {
    return NextResponse.json({ user: null });
  }
}
