import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// Mock KYC webhook handler for Sumsub/Onfido integration
// In production, this would receive webhooks from the KYC provider
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verify webhook signature (mock implementation)
    const signature = request.headers.get("x-webhook-signature");
    
    // In production, verify signature against your KYC provider's secret
    // Example: const isValid = verifySignature(body, signature, KYC_WEBHOOK_SECRET);
    
    const {
      applicantId,
      reviewStatus, // "approved", "rejected", "pending"
      reviewResult,
      externalUserId, // User ID in our system
      type, // "applicantReviewed", "applicantPending", etc.
    } = body;

    console.log("KYC Webhook received:", {
      applicantId,
      reviewStatus,
      externalUserId,
      type,
    });

    // Map KYC provider status to our system
    let kycStatus: "pending" | "verified" | "rejected" = "pending";
    
    if (reviewStatus === "completed" && reviewResult?.reviewAnswer === "GREEN") {
      kycStatus = "verified";
    } else if (reviewStatus === "completed" && reviewResult?.reviewAnswer === "RED") {
      kycStatus = "rejected";
    }

    // Update user KYC status in database
    if (externalUserId) {
      const [updatedUser] = await db
        .update(users)
        .set({ 
          kycStatus,
          updatedAt: new Date(),
        })
        .where(eq(users.id, parseInt(externalUserId)))
        .returning();

      console.log("User KYC status updated:", {
        userId: externalUserId,
        kycStatus,
        user: updatedUser,
      });

      // In production, you might want to:
      // 1. Send email notification to user
      // 2. Trigger additional verification steps
      // 3. Log the event for compliance
      
      return NextResponse.json({
        success: true,
        message: "KYC status updated successfully",
        userId: externalUserId,
        kycStatus,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed",
    });

  } catch (error: any) {
    console.error("KYC webhook error:", error);
    return NextResponse.json(
      { error: "Failed to process KYC webhook", details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve KYC status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const walletAddress = searchParams.get("walletAddress");

    if (!userId && !walletAddress) {
      return NextResponse.json(
        { error: "userId or walletAddress is required" },
        { status: 400 }
      );
    }

    let user;
    if (userId) {
      [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(userId)))
        .limit(1);
    } else if (walletAddress) {
      [user] = await db
        .select()
        .from(users)
        .where(eq(users.walletAddress, walletAddress))
        .limit(1);
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      userId: user.id,
      walletAddress: user.walletAddress,
      kycStatus: user.kycStatus,
      name: user.name,
      email: user.email,
    });

  } catch (error: any) {
    console.error("KYC status check error:", error);
    return NextResponse.json(
      { error: "Failed to check KYC status", details: error.message },
      { status: 500 }
    );
  }
}