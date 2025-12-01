import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { donations, projects } from '@/db/schema';
import { eq, sql, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { walletAddress: string } }
) {
  try {
    const { walletAddress } = params;

    // Validate wallet address
    if (!walletAddress || walletAddress.trim() === '') {
      return NextResponse.json(
        { 
          error: 'Valid wallet address is required',
          code: 'INVALID_WALLET' 
        },
        { status: 400 }
      );
    }

    // Calculate totalContributed and totalDonations
    const totalStats = await db
      .select({
        totalContributed: sql<number>`COALESCE(SUM(${donations.amount}), 0)`,
        totalDonations: sql<number>`COALESCE(COUNT(${donations.id}), 0)`,
      })
      .from(donations)
      .where(eq(donations.donorWalletAddress, walletAddress));

    // Calculate activeProjects count
    const activeProjectsResult = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${donations.projectId})`,
      })
      .from(donations)
      .innerJoin(projects, eq(donations.projectId, projects.id))
      .where(
        and(
          eq(donations.donorWalletAddress, walletAddress),
          eq(projects.status, 'active')
        )
      );

    // Calculate completedProjects count
    const completedProjectsResult = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${donations.projectId})`,
      })
      .from(donations)
      .innerJoin(projects, eq(donations.projectId, projects.id))
      .where(
        and(
          eq(donations.donorWalletAddress, walletAddress),
          eq(projects.status, 'completed')
        )
      );

    // Calculate allProjects count (distinct projectIds regardless of status)
    const allProjectsResult = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${donations.projectId})`,
      })
      .from(donations)
      .where(eq(donations.donorWalletAddress, walletAddress));

    const statistics = {
      walletAddress,
      totalContributed: totalStats[0]?.totalContributed || 0,
      totalDonations: totalStats[0]?.totalDonations || 0,
      activeProjects: activeProjectsResult[0]?.count || 0,
      completedProjects: completedProjectsResult[0]?.count || 0,
      allProjects: allProjectsResult[0]?.count || 0,
    };

    return NextResponse.json(statistics, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}