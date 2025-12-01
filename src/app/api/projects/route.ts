import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, milestones, users } from "@/db/schema";
import { eq, and, SQL } from "drizzle-orm";

const VALID_CONTRACT_TEMPLATES = ["Wakālah", "Juʿālah", "Istisnāʿ"];
const VALID_STATUSES = ["active", "completed", "paused"];

interface MilestoneInput {
  description: string;
  amount: number;
  beneficiary: string;
}

interface ProjectInput {
  charityWallet: string;
  title: string;
  description: string;
  zakatMode?: boolean;
  asnafTag?: string;
  contractTemplate: string;
  totalAmount: number;
  metaCid?: string;
  milestones: MilestoneInput[];
}

// POST /api/projects
export async function POST(request: NextRequest) {
  try {
    const body: ProjectInput = await request.json();
    const {
      charityWallet,
      title,
      description,
      metaCid,
      zakatMode,
      asnafTag,
      contractTemplate,
      totalAmount,
      milestones: milestonesData,
    } = body;

    // console.log("body:", body);

    if (!charityWallet?.trim()) {
      return NextResponse.json(
        { error: "charityWallet is required", code: "MISSING_CHARITY_WALLET" },
        { status: 400 }
      );
    }

    // Lookup charityId from wallet
    const charity = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, charityWallet))
      .limit(1);
    if (!charity || charity.length === 0) {
      return NextResponse.json(
        {
          error: "No charity found with this wallet",
          code: "CHARITY_NOT_FOUND",
        },
        { status: 404 }
      );
    }
    const charityId = charity[0].id;

    // Validate other fields
    if (!title?.trim())
      return NextResponse.json(
        { error: "title is required", code: "INVALID_TITLE" },
        { status: 400 }
      );
    if (!description?.trim())
      return NextResponse.json(
        { error: "description is required", code: "INVALID_DESCRIPTION" },
        { status: 400 }
      );

    if (!metaCid?.trim()) {
      return NextResponse.json(
        { error: "metaCid (IPFS hash) is required", code: "MISSING_META_CID" },
        { status: 400 }
      );
    }

    if (!VALID_CONTRACT_TEMPLATES.includes(contractTemplate)) {
      return NextResponse.json(
        {
          error: `contractTemplate must be one of: ${VALID_CONTRACT_TEMPLATES.join(", ")}`,
          code: "INVALID_CONTRACT_TEMPLATE",
        },
        { status: 400 }
      );
    }
    if (!totalAmount || totalAmount <= 0)
      return NextResponse.json(
        { error: "totalAmount must be positive", code: "INVALID_TOTAL_AMOUNT" },
        { status: 400 }
      );
    if (!milestonesData?.length)
      return NextResponse.json(
        { error: "milestones array is required", code: "INVALID_MILESTONES" },
        { status: 400 }
      );

    const milestonesSum = milestonesData.reduce((sum, m) => sum + m.amount, 0);
    if (Math.abs(milestonesSum - totalAmount) > 0.01) {
      return NextResponse.json(
        {
          error: `Sum of milestone amounts (${milestonesSum}) must equal totalAmount (${totalAmount})`,
          code: "MILESTONES_SUM_MISMATCH",
        },
        { status: 400 }
      );
    }

    // Insert project
    const createdAt = new Date().toISOString();
    const [newProject] = await db
      .insert(projects)
      .values({
        charityId,
        title: title.trim(),
        description: description.trim(),
        metaCid: metaCid, // 👈 store IPFS CID
        zakatMode: !!zakatMode,
        asnafTag: asnafTag?.trim() || null,
        contractTemplate,
        totalAmount,
        fundedBalance: 0,
        status: "active",
        createdAt,
      })
      .returning();

    const projectId = newProject.id;

    // Insert milestones
    const createdMilestones = [];
    for (const m of milestonesData) {
      const [milestone] = await db
        .insert(milestones)
        .values({
          projectId,
          description: m.description.trim(),
          amount: m.amount,
          beneficiaryAddress: m.beneficiary.trim(),
          status: "pending",
          createdAt,
        })
        .returning();
      createdMilestones.push(milestone);
    }

    return NextResponse.json(
      { ...newProject, milestones: createdMilestones },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json(
      { error: "Internal server error: " + (error as any).message },
      { status: 500 }
    );
  }
}

// GET /api/projects
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Pagination
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Filters
    const status = searchParams.get("status");
    const zakatModeParam = searchParams.get("zakatMode");
    const charityIdParam = searchParams.get("charityId");

    const conditions: SQL[] = [];

    if (status) {
      if (!VALID_STATUSES.includes(status))
        return NextResponse.json(
          {
            error: `status must be one of: ${VALID_STATUSES.join(", ")}`,
            code: "INVALID_STATUS_FILTER",
          },
          { status: 400 }
        );
      conditions.push(eq(projects.status, status));
    }

    if (zakatModeParam !== null) {
      conditions.push(eq(projects.zakatMode, zakatModeParam === "true"));
    }

    if (charityIdParam) {
      const charityId = parseInt(charityIdParam);
      if (isNaN(charityId) || charityId <= 0)
        return NextResponse.json(
          {
            error: "charityId must be positive integer",
            code: "INVALID_CHARITY_ID_FILTER",
          },
          { status: 400 }
        );
      conditions.push(eq(projects.charityId, charityId));
    }

    // Build query with proper typing
    let query = db.select().from(projects);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const results = await query.limit(limit).offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json(
      { error: "Internal server error: " + (error as any).message },
      { status: 500 }
    );
  }
}
