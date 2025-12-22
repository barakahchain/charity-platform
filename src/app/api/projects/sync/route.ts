// app/api/projects/sync/route.ts - Fixed with better wallet handling
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  projects,
  users,
  userWallets,
  milestones,
  donations,
  walletEvents,
} from "@/db/schema";
import { eq, and, or } from "drizzle-orm";

// Global lock map to prevent concurrent syncs
const syncLocks = new Map<string, Promise<any>>();

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
        const { address } = data;

    // console.log("Sync request data:", data);
    
    
    // Validate required fields
    if (!address || !data.goal || !data.charity) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

     // 🛡️ PREVENT CONCURRENT SYNC FOR SAME ADDRESS
    if (syncLocks.has(address)) {
      console.log(`⏳ Sync already in progress for ${address}, returning existing promise`);
      return await syncLocks.get(address);
    }

    // Create the sync promise with lock
    const syncPromise = (async () => {
      try {
        return await processSync(data);
      } finally {
        // Always remove the lock when done
        syncLocks.delete(address);
      }
    })();

    // Store the promise in lock map
    syncLocks.set(address, syncPromise);
    return await syncPromise;

  } catch (error: any) {
    console.error("Error in sync route:", error);
    return NextResponse.json(
      { error: `Failed to sync: ${error.message}` },
      { status: 500 }
    );
  }
}

// Main sync processing function
async function processSync(data: any) {
  try {
    const {
      address,
      goal,
      deadline,
      completed,
      charity,
      builder,
      totalDonated,
      deadlineEnabled,
      metadata,
      milestones: milestones,
      donations: contractDonations, //not working
      metaCid,
    } = data;

      console.log(`🔄 Starting sync for ${address}`);


    // Helper function to find or create user by wallet address with proper error handling
    const findOrCreateUser = async (
      walletAddress: string,
      role: "charity" | "builder" | "donor",
      userData?: any
    ) => {
      try {
        // First, check if wallet already exists in user_wallets
        const existingWallet = await db
          .select()
          .from(userWallets)
          .where(eq(userWallets.walletAddress, walletAddress))
          .limit(1);

        if (existingWallet.length > 0) {
          // Wallet exists, return the associated user ID
          return existingWallet[0].userId;
        }

        // Try to find user by potential email
        const potentialEmail = `${walletAddress.slice(0, 8)}@onchain.${role}`;
        const userByEmail = await db
          .select()
          .from(users)
          .where(eq(users.email, potentialEmail))
          .limit(1);

        if (userByEmail.length > 0) {
          // User exists with this email, check if they already have this wallet
          const userWalletExists = await db
            .select()
            .from(userWallets)
            .where(
              and(
                eq(userWallets.userId, userByEmail[0].id),
                eq(userWallets.walletAddress, walletAddress)
              )
            )
            .limit(1);

          if (userWalletExists.length === 0) {
            // Add wallet to existing user
            await db.insert(userWallets).values({
              userId: userByEmail[0].id,
              walletAddress: walletAddress,
              isPrimary: true,
              status: "active",
              createdAt: new Date().toISOString(),
            });
          }
          return userByEmail[0].id;
        }

        // Create new user with unique email
        let baseEmail = `${walletAddress.slice(0, 8)}@onchain.${role}`;
        let email = baseEmail;
        let counter = 1;

        // Ensure unique email
        while (true) {
          const existingEmail = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (existingEmail.length === 0) {
            break;
          }
          email = `${walletAddress.slice(0, 6)}${counter}@onchain.${role}`;
          counter++;
        }

        // Create new user
        const newUser = await db
          .insert(users)
          .values({
            name:
              userData?.name ||
              `${role.charAt(0).toUpperCase() + role.slice(1)} ${walletAddress.slice(0, 8)}`,
            email: email,
            password: "onchain-generated",
            role: role,
            kycStatus: "pending",
            createdAt: new Date().toISOString(),
          })
          .returning();

        // Create wallet association
        await db.insert(userWallets).values({
          userId: newUser[0].id,
          walletAddress: walletAddress,
          isPrimary: true,
          status: "active",
          createdAt: new Date().toISOString(),
        });

        return newUser[0].id;
      } catch (error: any) {
        console.error(
          `Error in findOrCreateUser for wallet ${walletAddress}:`,
          error
        );

        // If there's a constraint error, try to find the existing record
        if (
          error.code === "SQLITE_CONSTRAINT" &&
          error.message?.includes("user_wallets.wallet_address")
        ) {
          console.log(
            `Wallet ${walletAddress} already exists, finding owner...`
          );

          const existingWallet = await db
            .select()
            .from(userWallets)
            .where(eq(userWallets.walletAddress, walletAddress))
            .limit(1);

          if (existingWallet.length > 0) {
            return existingWallet[0].userId;
          }
        }

        throw error; // Re-throw if we can't handle it
      }
    };

    // Find or create charity user
    const charityId = await findOrCreateUser(charity, "charity", {
      name: metadata?.title || `Charity ${charity.slice(0, 8)}`,
    });

    // Find or create builder user (if builder exists and is not zero address)
    let builderId: number | null = null;
    if (builder && builder !== "0x0000000000000000000000000000000000000000") {
      try {
        builderId = await findOrCreateUser(builder, "builder", {
          name: `Builder ${builder.slice(0, 8)}`,
        });
      } catch (error) {
        console.error(
          `Failed to find/create builder user for ${builder}:`,
          error
        );
        builderId = null;
      }
    }

    // Check if project exists
    const existingProject = await db
      .select()
      .from(projects)
      .where(eq(projects.contractAddress, address))
      .limit(1);

    // Determine project status
    let status = "active";
    if (completed) {
      status = "completed";
    } else if (
      deadlineEnabled &&
      deadline &&
      Number(deadline) * 1000 < Date.now()
    ) {
      status = "expired";
    }

    const projectData = {
      contractAddress: address,
      walletAddress: charity,
      title: metadata?.title || `On-Chain Project ${address.slice(0, 8)}`,
      description: metadata?.description || "Project created directly on-chain",
      totalAmount: Number(goal) / 1e18,
      fundedBalance: Number(totalDonated) / 1e18,
      status,
      contractTemplate: metadata?.contractTemplate || "unknown",
      zakatMode: metadata?.type === "zakat",
      asnafTag: metadata?.asnafCategory,
      metaCid: metaCid || metadata?.metaCid || "",
      deadline: deadline
        ? new Date(Number(deadline) * 1000).toISOString()
        : null,
      deadlineEnabled: deadlineEnabled || false,
      charityId,
      builderId,
      updatedAt: new Date().toISOString(),
    };

    let projectResult;

    if (existingProject.length > 0) {
      // Update existing
      projectResult = await db
        .update(projects)
        .set(projectData)
        .where(eq(projects.id, existingProject[0].id))
        .returning();
    } else {
      // Create new
      projectResult = await db
        .insert(projects)
        .values({
          ...projectData,
          createdAt: new Date().toISOString(),
        })
        .returning();
    }

    const projectId = projectResult[0].id;

    // Sync milestones if provided
    if (Array.isArray(milestones)) {
      await syncMilestones(projectId, milestones, metadata);
    }

    console.log("Project sync successful for address:", address);

    return NextResponse.json({
      success: true,
      message:
        existingProject.length > 0 ? "Project updated" : "Project created",
      project: projectResult[0],
    });
  } catch (error: any) {
    console.error("Error in sync route:", error);

    // Provide more helpful error message
    let errorMessage = `Failed to sync: ${error.message}`;
    let errorDetails = error.cause?.message || error.details;

    if (error.code === "SQLITE_CONSTRAINT") {
      if (error.message?.includes("user_wallets.wallet_address")) {
        errorMessage = "Wallet address already associated with another user";
      } else if (error.message?.includes("users.email")) {
        errorMessage = "Email address already exists";
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        constraint:
          error.code === "SQLITE_CONSTRAINT" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// Fixed syncMilestones function with proper query
// Fixed syncMilestones function
async function syncMilestones(
  projectId: number,
  contractMilestones: Array<{ amount: string | bigint; released: boolean }>,
  metadata: any
) {
  const metadataMilestones = metadata?.milestones || [];
  
  console.log("Syncing milestones for project:", projectId);
  console.log("Contract milestones:", contractMilestones);
  console.log("Metadata milestones:", metadataMilestones);

  for (let i = 0; i < contractMilestones.length; i++) {
    const contractMilestone = contractMilestones[i];
    const amount = Number(contractMilestone.amount) / 1e18;
    const released = contractMilestone.released;

    // Get data from metadata
    const metadataMilestone = metadataMilestones[i] || {};
    const description = metadataMilestone.description || `Milestone ${i + 1}`;
    const beneficiaryAddress = metadataMilestone.beneficiaryAddress || metadata?.createdBy || "";

    console.log(`Processing milestone ${i}:`, {
      amount,
      released,
      description,
      beneficiaryAddress
    });

    try {
      // Check if milestone exists by project and order index
      const existing = await db
        .select()
        .from(milestones)
        .where(
          and(
            eq(milestones.projectId, projectId),
            eq(milestones.orderIndex, i)
          )
        )
        .limit(1);

      const milestoneData = {
        projectId,
        orderIndex: i,
        description,
        amount,
        beneficiaryAddress,
        status: released ? "paid" : "pending",
        submittedAt: released ? new Date().toISOString() : null,
        verifiedAt: released ? new Date().toISOString() : null,
        verifierId: released ? 1 : null, // Default verifier ID
      };

      if (existing.length > 0) {
        console.log(`Updating existing milestone ${i} for project ${projectId}`);
        await db
          .update(milestones)
          .set({
            ...milestoneData
          })
          .where(eq(milestones.id, existing[0].id));
      } else {
        console.log(`Creating new milestone ${i} for project ${projectId}`);
        await db.insert(milestones).values({
          ...milestoneData,
          createdAt: new Date().toISOString(),
        });
      }
      
      console.log(`Milestone ${i} synced successfully`);
    } catch (error) {
      console.error(`Error syncing milestone ${i}:`, error);
    }
  }
}

// GET endpoint remains the same
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get("address");

  if (address) {
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.contractAddress, address))
      .limit(1);

    if (project.length === 0) {
      return NextResponse.json({
        synced: false,
        message: "Project not found in database",
      });
    }

    const projectData = project[0];

    if (!projectData.updatedAt) {
      return NextResponse.json({
        synced: false,
        message: "Project has never been synced",
        project: projectData,
      });
    }

    const donationCount = await db
      .select()
      .from(donations)
      .where(eq(donations.projectId, projectData.id))
      .then((res) => res.length);

    const milestoneCount = await db
      .select()
      .from(milestones)
      .where(eq(milestones.projectId, projectData.id))
      .then((res) => res.length);

    const lastSynced = new Date(projectData.updatedAt);
    const hoursSinceSync =
      (Date.now() - lastSynced.getTime()) / (1000 * 60 * 60);

    return NextResponse.json({
      synced: true,
      lastSynced: projectData.updatedAt,
      hoursSinceSync: hoursSinceSync.toFixed(2),
      project: projectData,
      donations: donationCount,
      milestones: milestoneCount,
    });
  }

  return NextResponse.json({
    endpoint: "POST /api/projects/sync",
    description: "Sync blockchain project data to database",
    required_fields: {
      address: "Project contract address",
      goal: "Project goal amount (in wei)",
      charity: "Charity wallet address",
      // Optional fields
      deadline: "Deadline timestamp (in seconds)",
      completed: "Boolean - project completion status",
      builder: "Builder wallet address",
      totalDonated: "Total donated amount (in wei)",
      deadlineEnabled: "Boolean - deadline enforcement",
      metadata: "Project metadata object",
      milestones: "Array of milestone objects",
      donations: "Array of donation objects",
      metaCid: "IPFS metadata CID",
    },
    example_request: {
      address: "0x...",
      goal: "1000000000000000000",
      charity: "0x...",
      totalDonated: "10000000000000000",
      deadlineEnabled: false,
      metadata: { title: "Project Title", description: "..." },
      milestones: [{ amount: "500000000000000000", released: false }],
      donations: [
        { donor: "0x...", amount: "10000000000000000", txHash: "0x..." },
      ],
    },
  });
}
