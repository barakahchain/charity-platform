// app/api/projects/public/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq, ne, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type"); // zakat or sadaqah
    const limit = searchParams.get("limit");
    
    // Build conditions array
    const conditions = [];
    
    // Filter out deleted/draft projects
    conditions.push(ne(projects.status, "deleted"));
    
    if (status && status !== "all") {
      conditions.push(eq(projects.status, status));
    }

    if (type && type !== "all") {
      const zakatMode = type === "zakat";
      conditions.push(eq(projects.zakatMode, zakatMode));
    }

    // Build the query
    const query = db
      .select()
      .from(projects)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(projects.createdAt)); // Newest first

    // Apply limit if specified
    const queryResult = await query.limit(limit ? parseInt(limit) : 100);

    return NextResponse.json(queryResult);
  } catch (error) {
    console.error("Error fetching public projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch public projects" },
      { status: 500 }
    );
  }
}