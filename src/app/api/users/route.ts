import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, or, sql } from "drizzle-orm";

const VALID_ROLES = ["admin", "donor", "charity", "builder", "verifier", "ssb"];
const VALID_KYC_STATUSES = ["pending", "verified", "rejected"];

function validateEmail(email: string): boolean {
  return email.includes("@") && email.length > 3;
}

function validateRole(role: string): boolean {
  return VALID_ROLES.includes(role);
}

// Helper function to normalize wallet addresses
function normalizeWalletAddress(wallet: string): string {
  return wallet.toLowerCase().trim();
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const wallet = searchParams.get("wallet");
    const role = searchParams.get("role");
    const kycStatus = searchParams.get("kycStatus");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const debug = searchParams.get("debug");

    // ✅ Debug: Show all wallets
    if (debug === "true") {
      const allUsers = await db.select().from(users);
      const wallets = allUsers.map((u) => ({
        id: u.id,
        wallet: u.walletAddress,
        name: u.name,
        email: u.email,
        role: u.role,
      }));

      console.log("🔍 ALL WALLETS IN DATABASE:", wallets);
      return NextResponse.json(
        {
          total: wallets.length,
          wallets: wallets,
        },
        { status: 200 }
      );
    }

    // ✅ Single user fetch by wallet - NORMALIZE TO LOWERCASE
    if (wallet) {
      const normalizedWallet = normalizeWalletAddress(wallet);

      console.log(
        `🔍 Searching for wallet: "${wallet}" -> normalized: "${normalizedWallet}"`
      );

      const result = await db
        .select()
        .from(users)
        .where(sql`LOWER(${users.walletAddress}) = ${normalizedWallet}`)
        .limit(1);

      const user = result[0];

      if (!user) {
        console.log(`❌ Wallet not found: "${normalizedWallet}"`);
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      console.log(
        `✅ Wallet found: "${normalizedWallet}" -> User: ${user.name}`
      );
      return NextResponse.json(user, { status: 200 });
    }

    // ✅ Otherwise list users (with filters)
    const conditions = [];
    if (role) {
      if (!validateRole(role)) {
        return NextResponse.json(
          { error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` },
          { status: 400 }
        );
      }
      conditions.push(eq(users.role, role));
    }

    if (kycStatus) {
      if (!VALID_KYC_STATUSES.includes(kycStatus)) {
        return NextResponse.json(
          {
            error: `Invalid KYC status. Must be one of: ${VALID_KYC_STATUSES.join(", ")}`,
          },
          { status: 400 }
        );
      }
      conditions.push(eq(users.kycStatus, kycStatus));
    }

    const query =
      conditions.length > 0
        ? db
            .select()
            .from(users)
            .where(and(...conditions))
        : db.select().from(users);

    const results = await query.limit(limit).offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json(
      { error: "Internal server error: " + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, role, walletAddress } = body;

    console.log("📥 POST request received:", {
      name,
      email,
      role,
      walletAddress,
    });

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        {
          error: "Name is required and must be a non-empty string",
          code: "MISSING_NAME",
        },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        {
          error: "Email is required",
          code: "MISSING_EMAIL",
        },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        {
          error: "Invalid email format",
          code: "INVALID_EMAIL",
        },
        { status: 400 }
      );
    }

    if (!role || typeof role !== "string") {
      return NextResponse.json(
        {
          error: "Role is required",
          code: "MISSING_ROLE",
        },
        { status: 400 }
      );
    }

    if (!validateRole(role)) {
      return NextResponse.json(
        {
          error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`,
          code: "INVALID_ROLE",
        },
        { status: 400 }
      );
    }

    if (
      !walletAddress ||
      typeof walletAddress !== "string" ||
      walletAddress.trim().length === 0
    ) {
      return NextResponse.json(
        {
          error: "Wallet address is required and must be a non-empty string",
          code: "MISSING_WALLET_ADDRESS",
        },
        { status: 400 }
      );
    }

    // ✅ Normalize wallet address for both storage and comparison
    const normalizedWallet = normalizeWalletAddress(walletAddress);
    const normalizedEmail = email.toLowerCase().trim();

    console.log(
      `🔍 Checking duplicates - Email: "${normalizedEmail}", Wallet: "${normalizedWallet}"`
    );

    // Check for existing email or wallet address
    const existingUser = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.email, normalizedEmail),
          eq(users.walletAddress, normalizedWallet)
        )
      )
      .limit(1);

    if (existingUser.length > 0) {
      const existing = existingUser[0];
      console.log(`❌ Duplicate found - Existing:`, {
        email: existing.email,
        wallet: existing.walletAddress,
        matchEmail: existing.email === normalizedEmail,
        matchWallet: existing.walletAddress === normalizedWallet,
      });

      return NextResponse.json(
        {
          error: "Email or wallet address already exists",
          code: "DUPLICATE_USER",
        },
        { status: 409 }
      );
    }

    console.log(
      `✅ Creating new user - Name: "${name}", Wallet: "${normalizedWallet}"`
    );

    // Create new user with normalized wallet
    const newUser = await db
      .insert(users)
      .values({
        name: name.trim(),
        email: normalizedEmail,
        role: role,
        walletAddress: normalizedWallet, // ✅ Store normalized
        kycStatus: "pending",
        createdAt: new Date().toISOString(),
      })
      .returning();

    console.log(`✅ User created successfully - ID: ${newUser[0].id}`);
    return NextResponse.json(newUser[0], { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json(
      { error: "Internal server error: " + error },
      { status: 500 }
    );
  }
}
