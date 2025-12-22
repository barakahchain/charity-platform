import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem } from "viem";
import { polygonAmoy } from "viem/chains";
import { getProjectMetadataFromIPFS } from "@/app/api/lib/ipfs";
import projectJSON from "@/lib/abis/Project.json";

const ProjectAbi = projectJSON.abi;
let isSyncing = false;

function serializeBigInts(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "bigint") {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => serializeBigInts(item));
  }

  if (typeof obj === "object" && obj.constructor === Object) {
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = serializeBigInts(obj[key]);
    }
    return newObj;
  }

  return obj;
}

// Add donations fetching function
async function fetchContractDonations(address: `0x${string}`) {
  try {
    const publicClient = createPublicClient({
      chain: polygonAmoy,
      transport: http("https://rpc-amoy.polygon.technology"),
    });

    // OPTION 1: Return empty array for now
    console.log(`Skipping donation logs fetch for performance`);
    return [];

    const donatedEvents = await publicClient.getLogs({
      address,
      event: parseAbiItem(
        "event Donated(address indexed donor, uint256 amount)"
      ),
      fromBlock: 0n,
      toBlock: "latest",
    });

    // Get block timestamps for each event
    const donations = [];
    for (const event of donatedEvents) {
      try {
        const block = await publicClient.getBlock({
          blockNumber: event.blockNumber,
        });

        donations.push({
          donor: event.args.donor as string,
          amount: (event.args.amount as bigint).toString(),
          txHash: event.transactionHash,
          blockNumber: Number(event.blockNumber),
          timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
        });
      } catch (blockError) {
        // Fallback if block fetch fails
        donations.push({
          donor: event.args.donor as string,
          amount: (event.args.amount as bigint).toString(),
          txHash: event.transactionHash,
          blockNumber: Number(event.blockNumber),
          timestamp: new Date().toISOString(), // Use current time as fallback
        });
      }
    }

    console.log(`Fetched ${donations.length} donations for project ${address}`);
    return donations;
  } catch (error) {
    console.error("Error fetching donations:", error);
    return [];
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await context.params;

    if (!address || address.length !== 42) {
      return NextResponse.json(
        { error: "Invalid project address" },
        { status: 400 }
      );
    }

    const publicClient = createPublicClient({
      chain: polygonAmoy,
      transport: http("https://rpc-amoy.polygon.technology"),
    });

    // Read all project data in a single multicall
    const contracts = [
      {
        address: address as `0x${string}`,
        abi: ProjectAbi,
        functionName: "goal",
      },
      {
        address: address as `0x${string}`,
        abi: ProjectAbi,
        functionName: "deadline",
      },
      {
        address: address as `0x${string}`,
        abi: ProjectAbi,
        functionName: "completed",
      },
      {
        address: address as `0x${string}`,
        abi: ProjectAbi,
        functionName: "charity",
      },
      {
        address: address as `0x${string}`,
        abi: ProjectAbi,
        functionName: "builder",
      },
      {
        address: address as `0x${string}`,
        abi: ProjectAbi,
        functionName: "totalDonated",
      },
      {
        address: address as `0x${string}`,
        abi: ProjectAbi,
        functionName: "deadlineEnabled",
      },
      {
        address: address as `0x${string}`,
        abi: ProjectAbi,
        functionName: "metaCid",
      },
      {
        address: address as `0x${string}`,
        abi: ProjectAbi,
        functionName: "milestoneCount",
      },
    ] as const;

    const results = await publicClient.multicall({
      contracts,
    });

    // Process results
    const [
      goal,
      deadline,
      completed,
      charity,
      builder,
      totalDonated,
      deadlineEnabled,
      metaCid,
      milestoneCount,
    ] = results.map((r) => r.result);

    // Fetch metadata from IPFS if exists
    let metadata = null;
    if (metaCid && typeof metaCid === "string" && metaCid.trim().length > 0) {
      metadata = await getProjectMetadataFromIPFS(metaCid as string);
    }

    // Fetch milestones
    const milestones = await fetchContractMilestones(
      address as `0x${string}`,
      Number(milestoneCount || 0)
    );

    // Fetch donations (parallel for better performance)
    const donations = await fetchContractDonations(address as `0x${string}`);

    const projectData = {
      address,
      goal: goal?.toString(),
      deadline: deadline?.toString(),
      completed: completed || false,
      charity: charity || "",
      builder: builder || "",
      totalDonated: totalDonated?.toString() || "0",
      deadlineEnabled: deadlineEnabled || false,
      metaCid: metaCid || "",
      metadata,
      milestones: milestones.map((m) => ({
        amount: m.amount.toString(),
        released: m.released,
      })),
      donations, // Include donations array
    };

    console.log(
      `Calling sync for ${address} from referrer:`,
      request.headers.get("referer")
    );
    console.log(`User agent:`, request.headers.get("user-agent"));

    // Sync to database (in background, don't wait for response)
    syncProjectToDatabase(projectData)
      .then((syncResult) => {
        console.log("Database sync result:", syncResult);
      })
      .catch((error) => {
        console.error("Background sync failed:", error);
      });

    return NextResponse.json({
      success: true,
      data: projectData, // Already serialized
    });
  } catch (error: any) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Failed to fetch project data", details: error.message },
      { status: 500 }
    );
  }
}

async function fetchContractMilestones(address: `0x${string}`, count: number) {
  if (count <= 0) return [];

  const publicClient = createPublicClient({
    chain: polygonAmoy,
    transport: http("https://rpc-amoy.polygon.technology"),
  });

  const contracts = Array.from({ length: count }, (_, i) => ({
    address,
    abi: ProjectAbi.filter(
      (item: any) => item.type === "function" && item.name === "getMilestone"
    ),
    functionName: "getMilestone" as const,
    args: [BigInt(i)] as const,
  }));

  const results = await publicClient.multicall({
    contracts: contracts as any,
  });

  return results.map((result: any) => {
    if (result.status === "success" && result.result) {
      const [amount, released] = result.result as [bigint, boolean];
      return { amount, released };
    }
    return { amount: BigInt(0), released: false };
  });
}

async function syncProjectToDatabase(projectData: any) {
  if (isSyncing) {
    console.log("⚠️ Sync already in progress, skipping");
    return null;
  }

  isSyncing = true;

  try {
    // Use relative URL for same-origin requests
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const syncResponse = await fetch(`${baseUrl}/api/projects/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projectData),
    });

    if (!syncResponse.ok) {
      throw new Error(`Sync failed: ${syncResponse.status}`);
    }

    return await syncResponse.json();
  } catch (error) {
    console.error("Sync to database failed:", error);
    return null;
  }
}
