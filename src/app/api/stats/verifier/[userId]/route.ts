import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { milestones } from '@/db/schema';
import { eq, and, or, inArray, sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

    // Validate userId
    const userIdInt = parseInt(userId);
    if (!userId || isNaN(userIdInt) || userIdInt <= 0) {
      return NextResponse.json(
        {
          error: 'Valid user ID is required',
          code: 'INVALID_USER_ID',
        },
        { status: 400 }
      );
    }

    // Calculate pending: Count of milestones with status='submitted' (awaiting verification)
    const pendingResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(milestones)
      .where(eq(milestones.status, 'submitted'));

    const pending = Number(pendingResult[0]?.count || 0);

    // Calculate verified: Count of milestones where verifierId matches userId AND status='verified'
    const verifiedResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(milestones)
      .where(
        and(
          eq(milestones.verifierId, userIdInt),
          eq(milestones.status, 'verified')
        )
      );

    const verified = Number(verifiedResult[0]?.count || 0);

    // Calculate rejected: Count of milestones where verifierId matches userId AND status='rejected'
    const rejectedResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(milestones)
      .where(
        and(
          eq(milestones.verifierId, userIdInt),
          eq(milestones.status, 'rejected')
        )
      );

    const rejected = Number(rejectedResult[0]?.count || 0);

    // Calculate totalReviewed: Sum of verified + rejected
    const totalReviewed = verified + rejected;

    // Return statistics
    return NextResponse.json(
      {
        userId: userIdInt,
        pending,
        verified,
        rejected,
        totalReviewed,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET verifier statistics error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + error,
      },
      { status: 500 }
    );
  }
}