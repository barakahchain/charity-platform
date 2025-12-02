// lib/auth.ts
import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = "session";

export interface AuthenticatedUser {
  id: number;
  name: string;
  role: string;
  email: string;
}

export async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    
    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(JWT_SECRET)
    );

    // console.log("JWT payload:", payload);

    return {
      id: payload.id as number,
      name: payload.name as string,
      role: payload.role as string,
      email: payload.email as string,
    };
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

export async function requireAuth(request: NextRequest): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    throw new Error("Unauthorized: Please log in");
  }
  return user;
}

export async function requireRole(request: NextRequest, requiredRole: string): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    throw new Error("Unauthorized: Please log in");
  }
  if (user.role !== requiredRole) {
    throw new Error(`Forbidden: ${requiredRole} role required`);
  }
  return user;
}