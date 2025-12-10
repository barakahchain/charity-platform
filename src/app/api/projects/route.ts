// app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, milestones, users, userWallets } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser, requireRole } from "@/app/api/lib/auth";

const VALID_CONTRACT_TEMPLATES = ["Wakālah", "Juʿālah", "Istisnāʿ"];

interface MilestoneInput {
  description: string;
  amount: number;
  beneficiary: string;
}

interface ProjectInput {
  title: string;
  description: string;
  zakatMode?: boolean;
  asnafTag?: string;
  contractTemplate: string;
  totalAmount: number;
  metaCid?: string;
  milestones: MilestoneInput[];
}

// GET /api/projects
export async function GET(req: NextRequest) {
  try {
    // Get user from session
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Please log in" },
        { status: 401 }
      );
    }

    console.log("🔍 Authenticated user from JWT:", user);
    console.log("🔍 User ID type:", typeof user.id, "Value:", user.id);

    const { searchParams } = new URL(req.url);

    // Admin can view all or filter by charityId (for admin dashboard)
    if (user.role === "admin") {
      const charityId = searchParams.get("charityId");
      if (charityId) {
        const charityProjects = await db
          .select()
          .from(projects)
          .where(eq(projects.charityId, parseInt(charityId)))
          .orderBy(projects.createdAt);
        return NextResponse.json(charityProjects);
      }
      // Admin can see all projects if no charityId specified
      const allProjects = await db
        .select()
        .from(projects)
        .orderBy(projects.createdAt);
      return NextResponse.json(allProjects);
    }

    const userId =
      typeof user.id === "string" ? parseInt(user.id, 10) : user.id;

    // Regular users (charity/donor) can only see their own projects
    // For charities: their created projects
    // For donors: projects they've donated to (you might want to add this)
    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.charityId, userId))
      .orderBy(projects.createdAt);

    console.log("Fetched projects for user:", user.id, userProjects.length);
    return NextResponse.json(userProjects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
