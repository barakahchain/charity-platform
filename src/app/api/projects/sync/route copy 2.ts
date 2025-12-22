import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  projects,
  users,
  userWallets,
  donations,
  milestones,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createPublicClient, http, parseAbiItem } from "viem";
import { polygonAmoy } from "viem/chains";

// Import your ABI
import factoryJSON from "@/lib/abis/ProjectFactory.json";
import projectJSON from "@/lib/abis/Project.json";

const ProjectFactoryABI = factoryJSON.abi;
const ProjectABI = projectJSON.abi;

// Configure blockchain client
const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(
    process.env.BLOCKCHAIN_RPC_URL || "https://rpc-amoy.polygon.technology"
  ),
});

const FACTORY_CONTRACT_ADDRESS = process.env
  .NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS as `0x${string}`;

// IPFS helper function
async function fetchIPFSMetadata(cid: string) {
  try {
    const response = await fetch(`https://ipfs.io/ipfs/${cid}`);
    if (!response.ok) throw new Error(`IPFS fetch failed: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch IPFS metadata for CID: ${cid}`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, address, forceRefresh } = await request.json();

    switch (action) {
      case "sync-all":
        return await syncAllProjects();
      case "sync-single":
        if (!address) {
          return NextResponse.json(
            { error: "Project address required" },
            { status: 400 }
          );
        }
        return await syncSingleProject(address, forceRefresh);
      case "sync-donations":
        if (!address) {
          return NextResponse.json(
            { error: "Project address required" },
            { status: 400 }
          );
        }
        return await syncProjectDonations(address);
      case "sync-milestones":
        if (!address) {
          return NextResponse.json(
            { error: "Project address required" },
            { status: 400 }
          );
        }
        return await syncProjectMilestones(address);
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in sync route:", error);
    return NextResponse.json({ error: "Failed to sync data" }, { status: 500 });
  }
}

// Sync all projects from the factory
async function syncAllProjects() {
  try {
    // Get all projects from factory
    const projectAddresses = (await publicClient.readContract({
      address: FACTORY_CONTRACT_ADDRESS,
      abi: ProjectFactoryABI,
      functionName: "getAllProjects",
    })) as `0x${string}`[];

    const results = [];
    let synced = 0;
    let errors = 0;

    // Process each project (consider adding rate limiting for large numbers)
    for (const address of projectAddresses) {
      try {
        // Call syncSingleProject and parse the response
        const response = await syncSingleProject(address, false);
        const result = await response.json(); // Parse the JSON response

        if (result.success) {
          synced++;
        } else {
          errors++;
        }
        results.push({ address, success: result.success });
      } catch (error: any) {
        console.error(`Error syncing project ${address}:`, error);
        errors++;
        results.push({
          address,
          success: false,
          error: error?.message || "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${synced} projects, ${errors} errors`,
      total: projectAddresses.length,
      synced,
      errors,
      results,
    });
  } catch (error) {
    console.error("Error syncing all projects:", error);
    return NextResponse.json(
      { error: "Failed to sync all projects" },
      { status: 500 }
    );
  }
}

// Sync a single project with full details
async function syncSingleProject(
  projectAddress: `0x${string}`,
  forceRefresh: boolean = false
) {
  try {
    // Check if we recently synced this project (unless force refresh)
    if (!forceRefresh) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentlySynced = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.contractAddress, projectAddress),
            eq(projects.updatedAt, fiveMinutesAgo.toISOString())
          )
        )
        .limit(1);

      if (recentlySynced.length > 0) {
        return NextResponse.json({
          success: true,
          message: "Project recently synced",
          project: recentlySynced[0],
        });
      }
    }

    // Get project info from blockchain
    const projectInfo = (await publicClient.readContract({
      address: projectAddress,
      abi: ProjectABI,
      functionName: "getProjectInfo",
    })) as [string, string, string, bigint, bigint, boolean, boolean];

    const [
      platform,
      charity,
      builder,
      goal,
      deadline,
      completed,
      deadlineEnabled,
    ] = projectInfo;

    // Get additional project details
    const metaCid = (await publicClient.readContract({
      address: projectAddress,
      abi: ProjectABI,
      functionName: "metaCid",
    })) as string;

    const totalDonated = (await publicClient.readContract({
      address: projectAddress,
      abi: ProjectABI,
      functionName: "totalDonated",
    })) as bigint;

    // Fetch metadata from IPFS
    let metadata = null;
    if (metaCid) {
      metadata = await fetchIPFSMetadata(metaCid);
    }

    // First, find or create charity user by wallet address
    let charityUser = await db
      .select()
      .from(users)
      .leftJoin(userWallets, eq(users.id, userWallets.userId))
      .where(eq(userWallets.walletAddress, charity))
      .limit(1);

    let charityId: number;

    if (charityUser.length === 0) {
      // Charity user doesn't exist, create one
      const newUser = await db
        .insert(users)
        .values({
          name: metadata?.title || `Charity ${charity.slice(0, 8)}`,
          email: `${charity.slice(0, 8)}@onchain.charity`,
          password: "onchain-generated",
          role: "charity",
          kycStatus: "pending",
          createdAt: new Date().toISOString(),
        })
        .returning();

      // Create wallet entry for the charity
      await db.insert(userWallets).values({
        userId: newUser[0].id,
        walletAddress: charity,
        isPrimary: true,
        status: "active",
        createdAt: new Date().toISOString(),
      });

      charityId = newUser[0].id;
    } else {
      charityId = charityUser[0].users.id;
    }

    // Check if project exists in DB
    const existingProject = await db
      .select()
      .from(projects)
      .where(eq(projects.contractAddress, projectAddress))
      .limit(1);

    // Determine project status
    let status = "active";
    if (completed) {
      status = "completed";
    } else if (deadlineEnabled && Number(deadline) * 1000 < Date.now()) {
      status = "expired";
    }

    const projectData = {
      contractAddress: projectAddress,
      walletAddress: charity,
      title:
        metadata?.title || `On-Chain Project ${projectAddress.slice(0, 8)}`,
      description: metadata?.description || "Project created directly on-chain",
      totalAmount: Number(goal) / 1e18,
      fundedBalance: Number(totalDonated) / 1e18,
      status,
      contractTemplate: metadata?.contractTemplate || "unknown",
      zakatMode: metadata?.type === "zakat",
      asnafTag: metadata?.asnafCategory,
      metaCid: metaCid || "",
      deadline: deadline
        ? new Date(Number(deadline) * 1000).toISOString()
        : null,
      deadlineEnabled: deadlineEnabled,
      updatedAt: new Date().toISOString(),
    };

    let projectResult;

    if (existingProject.length > 0) {
      // Update existing project
      projectResult = await db
        .update(projects)
        .set({
          ...projectData,
          charityId,
        })
        .where(eq(projects.id, existingProject[0].id))
        .returning();

      console.log(`Updated project: ${projectAddress}`);
    } else {
      // Create new project
      projectResult = await db
        .insert(projects)
        .values({
          ...projectData,
          charityId,
          createdAt: new Date().toISOString(),
        })
        .returning();

      console.log(`Created new project: ${projectAddress}`);
    }

    // Sync donations for this project
    await syncProjectDonations(projectAddress);

    // Sync milestones for this project
    await syncProjectMilestones(projectAddress);

    return NextResponse.json({
      success: true,
      message:
        existingProject.length > 0 ? "Project updated" : "Project created",
      project: projectResult[0],
      metadata: metadata,
    });
  } catch (error: any) {
    console.error(`Error syncing project ${projectAddress}:`, error);
    return NextResponse.json(
      { error: `Failed to sync project: ${error.message}` },
      { status: 500 }
    );
  }
}

// Sync donations for a specific project
async function syncProjectDonations(projectAddress: `0x${string}`) {
  try {
    // Get Donated events from blockchain
    const donatedEvents = await publicClient.getLogs({
      address: projectAddress,
      event: parseAbiItem(
        "event Donated(address indexed donor, uint256 amount)"
      ),
      fromBlock: 0n,
      toBlock: "latest",
    });

    const donationsSynced = [];

    for (const event of donatedEvents) {
      try {
        const donor = event.args.donor as string;
        const amount = Number(event.args.amount) / 1e18;
        const txHash = event.transactionHash;
        const blockNumber = Number(event.blockNumber);

        // Check if donation already exists
        const existingDonation = await db
          .select()
          .from(donations)
          .where(eq(donations.txHash, txHash))
          .limit(1);

        if (existingDonation.length === 0) {
          // Find or create donor user
          let donorUser = await db
            .select()
            .from(users)
            .leftJoin(userWallets, eq(users.id, userWallets.userId))
            .where(eq(userWallets.walletAddress, donor))
            .limit(1);

          let donorId = null;

          if (donorUser.length === 0) {
            // Create anonymous donor record
            const newUser = await db
              .insert(users)
              .values({
                name: `Donor ${donor.slice(0, 8)}`,
                email: `${donor.slice(0, 8)}@donor.charity`,
                password: "auto-generated",
                role: "donor",
                kycStatus: "anonymous",
                createdAt: new Date().toISOString(),
              })
              .returning();

            await db.insert(userWallets).values({
              userId: newUser[0].id,
              walletAddress: donor,
              isPrimary: true,
              status: "active",
              createdAt: new Date().toISOString(),
            });

            donorId = newUser[0].id;
          } else {
            donorId = donorUser[0].users.id;
          }

          // Get project ID
          const project = await db
            .select()
            .from(projects)
            .where(eq(projects.contractAddress, projectAddress))
            .limit(1);

          if (project.length > 0) {
            await db.insert(donations).values({
              projectId: project[0].id,
              donorId,
              donorWalletAddress: donor,
              amount,
              txHash,
              blockNumber,
              createdAt: new Date().toISOString(), // Logs don't have timestamp in args
            });

            donationsSynced.push({ donor, amount, txHash });
          }
        }
      } catch (error) {
        console.error(`Error processing donation event:`, error);
      }
    }

    return {
      success: true,
      message: `Synced ${donationsSynced.length} donations`,
      donations: donationsSynced,
    };
  } catch (error: any) {
    console.error(
      `Error syncing donations for project ${projectAddress}:`,
      error
    );
    return { success: false, error: error?.message || "Unknown error" };
  }
}

// Sync milestones for a specific project
async function syncProjectMilestones(projectAddress: `0x${string}`) {
  try {
    // Get milestone count
    const milestoneCount = (await publicClient.readContract({
      address: projectAddress,
      abi: ProjectABI,
      functionName: "milestoneCount",
    })) as bigint;

    const milestonesSynced = [];

    // Get project ID
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.contractAddress, projectAddress))
      .limit(1);

    if (project.length === 0) {
      return { success: false, error: "Project not found in database" };
    }

    const projectId = project[0].id;

    // Fetch each milestone
    for (let i = 0; i < Number(milestoneCount); i++) {
      try {
        const milestoneInfo = (await publicClient.readContract({
          address: projectAddress,
          abi: ProjectABI,
          functionName: "getMilestone",
          args: [BigInt(i)],
        })) as [bigint, boolean];

        const [amount, released] = milestoneInfo;

        // Check if milestone exists
        const existingMilestone = await db
          .select()
          .from(milestones)
          .where(
            and(
              eq(milestones.projectId, projectId),
              eq(milestones.amount, Number(amount) / 1e18)
            )
          )
          .limit(1);

        // In the milestone creation section:
        const milestoneData = {
          projectId,
          description: `Milestone ${i + 1}`,
          amount: Number(amount) / 1e18,
          beneficiaryAddress: project[0].walletAddress,
          status: released ? "paid" : "pending",
          submittedAt: released ? new Date().toISOString() : null,
          verifiedAt: released ? new Date().toISOString() : null,
          verifierId: released ? 1 : null, // Use appropriate verifier ID
          createdAt: new Date().toISOString(),
        };

        if (existingMilestone.length > 0) {
          // Update milestone
          await db
            .update(milestones)
            .set({
              status: released ? "paid" : "pending",
              submittedAt: released ? new Date().toISOString() : null,
              verifiedAt: released ? new Date().toISOString() : null,
              verifierId: released ? 1 : null, // Use appropriate verifier ID
            })
            .where(eq(milestones.id, existingMilestone[0].id));
        } else {
          // Create new milestone
          await db.insert(milestones).values(milestoneData);
        }

        milestonesSynced.push({
          index: i,
          amount: milestoneData.amount,
          released,
        });
      } catch (error) {
        console.error(`Error fetching milestone ${i}:`, error);
      }
    }

    return {
      success: true,
      message: `Synced ${milestonesSynced.length} milestones`,
      milestones: milestonesSynced,
    };
  } catch (error: any) {
    console.error(
      `Error syncing milestones for project ${projectAddress}:`,
      error
    );
    return { success: false, error: error.message };
  }
}

// GET endpoint for manual triggering or status checking
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get("address");
  const action = searchParams.get("action") || "status";

  if (action === "status" && address) {
    // Return sync status for a specific project
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

    // Check last sync time - handle null updatedAt
    const projectData = project[0];

    if (!projectData.updatedAt) {
      return NextResponse.json({
        synced: false,
        message: "Project has never been synced",
        project: projectData,
      });
    }

    const lastSynced = new Date(projectData.updatedAt);
    const hoursSinceSync =
      (Date.now() - lastSynced.getTime()) / (1000 * 60 * 60);

    return NextResponse.json({
      synced: true,
      lastSynced: projectData.updatedAt,
      hoursSinceSync: hoursSinceSync.toFixed(2),
      project: projectData,
    });
  }

  return NextResponse.json({
    endpoints: [
      {
        method: "POST",
        action: "sync-all",
        description: "Sync all projects from factory",
      },
      {
        method: "POST",
        action: "sync-single",
        description: "Sync a single project",
        params: { address: "string", forceRefresh: "boolean" },
      },
      {
        method: "POST",
        action: "sync-donations",
        description: "Sync donations for a project",
        params: { address: "string" },
      },
      {
        method: "POST",
        action: "sync-milestones",
        description: "Sync milestones for a project",
        params: { address: "string" },
      },
    ],
  });
}
