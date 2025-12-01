// app/api/projects/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, users, userWallets, walletEvents } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

// Validation schema
const CreateProjectSchema = z.object({
  contractAddress: z.string().min(1, "Contract address is required"),
  metadataCid: z.string().min(1, "Metadata CID is required"),
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().min(1, "Description is required"),
  zakatMode: z.boolean().default(false),
  asnafTag: z.string().nullable().optional(),
  contractTemplate: z.enum(["wakalah", "jualah", "istisna"]),
  totalAmount: z.number().positive("Total amount must be positive"),
  fundedBalance: z.number().min(0).default(0),
  status: z.enum(["active", "completed", "paused"]).default("active"),
  blockchainTxHash: z.string().optional().nullable(),
  charityAddress: z.string().min(1, "Charity address is required"),
  deadline: z.string().optional().nullable(), // Add deadline field
  deadlineEnabled: z.boolean().default(false), // Add deadlineEnabled field
});

export async function POST(request: NextRequest) {
  try {
    console.log("Creating new project...");
    const body = await request.json();

    // Validate input
    const validationResult = CreateProjectSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: validationResult.error.issues, // use .issues from ZodError to return validation problems
        },
        { status: 400 }
      );
    }

    const {
      contractAddress,
      metadataCid,
      title,
      description,
      zakatMode,
      asnafTag,
      contractTemplate,
      totalAmount,
      fundedBalance,
      status,
      blockchainTxHash,
      charityAddress,
      deadline,
      deadlineEnabled,
    } = validationResult.data;

    // Validate deadline if enabled
    if (deadlineEnabled && !deadline) {
      return NextResponse.json(
        {
          error: "Deadline required",
          message: "Deadline is required when deadline enforcement is enabled",
        },
        { status: 400 }
      );
    }

    if (deadlineEnabled && deadline) {
      const deadlineDate = new Date(deadline);
      const now = new Date();

      if (deadlineDate <= now) {
        return NextResponse.json(
          {
            error: "Invalid deadline",
            message: "Deadline must be in the future",
          },
          { status: 400 }
        );
      }
    }
    console.log("Input validated successfully.");
    // Check if project already exists with this contract address
    const existingProject = await db
      .select()
      .from(projects)
      .where(eq(projects.contractAddress, contractAddress))
      .limit(1);

    if (existingProject.length > 0) {
      return NextResponse.json(
        { error: "Project with this contract address already exists" },
        { status: 409 }
      );
    }

    // Find charity user by wallet address through userWallets table
    const charityWallet = await db
      .select({
        userId: userWallets.userId,
        userWalletId: userWallets.id,
        walletAddress: userWallets.walletAddress,
        userName: users.name,
        userEmail: users.email,
        userRole: users.role,
      })
      .from(userWallets)
      .innerJoin(users, eq(userWallets.userId, users.id))
      .where(
        and(
          sql`LOWER(${userWallets.walletAddress}) = LOWER(${charityAddress})`,
          eq(userWallets.status, "active")
        )
      )
      .limit(1);

    console.log("charityAddress:", charityAddress);

    console.log("Charity wallet lookup result:", charityWallet);

    if (charityWallet.length === 0) {
      return NextResponse.json(
        {
          error: "Charity wallet not found or inactive",
          message:
            "No active wallet found with this address. Please ensure the wallet is connected and active.",
        },
        { status: 404 }
      );
    }

    const charityId = charityWallet[0].userId;
    const userWalletId = charityWallet[0].userWalletId;

    // Verify user has charity role
    if (charityWallet[0].userRole !== "charity") {
      return NextResponse.json(
        {
          error: "Insufficient permissions",
          message: "Only users with charity role can create projects",
        },
        { status: 403 }
      );
    }

    // Format deadline for database storage
    const formattedDeadline =
      deadlineEnabled && deadline ? new Date(deadline).toISOString() : null;

    // Create project in database
    const [newProject] = await db
      .insert(projects)
      .values({
        charityId,
        walletAddress: charityAddress,
        title,
        description,
        metaCid: metadataCid,
        zakatMode,
        asnafTag: zakatMode ? asnafTag : null,
        contractTemplate,
        totalAmount,
        fundedBalance,
        status,
        blockchainTxHash,
        contractAddress,
        deadline: formattedDeadline,
        deadlineEnabled,
        createdAt: new Date().toISOString(),
      })
      .returning();

    console.log("Project created with ID:", newProject.id);

    // Log the project creation event in walletEvents
    await db.insert(walletEvents).values({
      userWalletId: userWalletId,
      eventType: "project_created",
      metadata: JSON.stringify({
        projectId: newProject.id,
        projectTitle: title,
        contractAddress,
        totalAmount,
        charityAddress,
        deadline: formattedDeadline,
        deadlineEnabled,
        timestamp: new Date().toISOString(),
      }),
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        project: {
          id: newProject.id,
          title: newProject.title,
          contractAddress: newProject.contractAddress,
          status: newProject.status,
          totalAmount: newProject.totalAmount,
          deadline: newProject.deadline,
          deadlineEnabled: newProject.deadlineEnabled,
          createdAt: newProject.createdAt,
        },
        message: "Project created successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating project:", error);

    // Handle database constraint errors
    if (error.message?.includes("UNIQUE constraint failed")) {
      return NextResponse.json(
        {
          error: "Project already exists",
          message: "A project with this contract address already exists",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to create project. Please try again.",
      },
      { status: 500 }
    );
  }
}

// Add other HTTP methods for completeness
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
