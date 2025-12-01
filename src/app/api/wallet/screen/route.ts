import { NextRequest, NextResponse } from "next/server";

// Mock wallet screening integration (TRM Labs / Chainalysis)
// In production, this would call the actual API
export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress is required" },
        { status: 400 }
      );
    }

    // Mock screening logic
    // In production, call TRM Labs API:
    // const response = await fetch('https://api.trmlabs.com/v2/screening/addresses', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.TRM_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     address: walletAddress,
    //     chain: 'polygon',
    //   }),
    // });

    // Mock response - simulate various risk levels
    const mockRiskScore = Math.random();
    
    let riskLevel: "low" | "medium" | "high" | "severe";
    let isBlocked = false;
    const flags: string[] = [];

    if (mockRiskScore < 0.7) {
      riskLevel = "low";
    } else if (mockRiskScore < 0.85) {
      riskLevel = "medium";
      flags.push("High transaction volume");
    } else if (mockRiskScore < 0.95) {
      riskLevel = "high";
      flags.push("Interaction with mixing service");
      flags.push("Multiple exchange accounts");
    } else {
      riskLevel = "severe";
      isBlocked = true;
      flags.push("OFAC sanctions list");
      flags.push("Known scam address");
    }

    // Check against hardcoded blocklist (for demo purposes)
    const blocklist = [
      "0x0000000000000000000000000000000000000000",
      "0xdead000000000000000000000000000000000000",
    ];

    if (blocklist.includes(walletAddress.toLowerCase())) {
      isBlocked = true;
      riskLevel = "severe";
      flags.push("Blocklisted address");
    }

    const screeningResult = {
      walletAddress,
      riskLevel,
      riskScore: mockRiskScore.toFixed(2),
      isBlocked,
      flags,
      timestamp: new Date().toISOString(),
      provider: "TRM Labs (Mock)",
    };

    console.log("Wallet screening result:", screeningResult);

    return NextResponse.json(screeningResult);

  } catch (error: any) {
    console.error("Wallet screening error:", error);
    return NextResponse.json(
      { error: "Failed to screen wallet", details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve screening history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress is required" },
        { status: 400 }
      );
    }

    // In production, fetch from database or screening API
    // Mock response for now
    return NextResponse.json({
      walletAddress,
      screeningHistory: [
        {
          timestamp: new Date().toISOString(),
          riskLevel: "low",
          riskScore: "0.25",
          flags: [],
        },
      ],
      totalScreenings: 1,
    });

  } catch (error: any) {
    console.error("Screening history error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve screening history", details: error.message },
      { status: 500 }
    );
  }
}