// app/api/donations/donor/user/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { donations, projects, milestones, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> } // Note: params is now a Promise
) {
  try {
    // Await the params before using them
    const { userId: userIdStr } = await params;
    const userId = parseInt(userIdStr);
    
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Get all donations by this user
    const userDonations = await db
      .select()
      .from(donations)
      .where(eq(donations.donorId, userId))
      .all();

    // Get unique project IDs from donations
    const projectIds = [...new Set(userDonations.map(d => d.projectId))];

    // Get projects with their details
    const userProjects = await Promise.all(
      projectIds.map(async (projectId) => {
        const project = await db
          .select()
          .from(projects)
          .where(eq(projects.id, projectId))
          .get();

        if (!project) return null;

        // Get charity name
        const charity = await db
          .select({
            name: users.name
          })
          .from(users)
          .where(eq(users.id, project.charityId))
          .get();

        // Get milestones for this project
        const projectMilestones = await db
          .select()
          .from(milestones)
          .where(eq(milestones.projectId, projectId))
          .all();

        return {
          id: project.id,
          title: project.title,
          description: project.description,
          charity: project.charityId,
          charityName: charity?.name || 'Unknown Charity',
          totalAmount: Number(project.totalAmount),
          fundedBalance: Number(project.fundedBalance),
          zakatMode: project.zakatMode,
          asnafTag: project.asnafTag,
          status: project.status,
          contractAddress: project.contractAddress,
          milestones: projectMilestones.map(m => ({
            id: m.id,
            description: m.description,
            status: m.status,
            amount: Number(m.amount)
          }))
        };
      })
    );

    // Filter out null projects and ensure type safety
    const validProjects = userProjects.filter((p): p is NonNullable<typeof p> => p !== null);

    // Calculate stats
    const totalContributed = userDonations.reduce((sum, d) => sum + Number(d.amount), 0);
    const activeProjects = validProjects.filter(p => p.status === 'active').length;
    const completedProjects = validProjects.filter(p => p.status === 'completed').length;

    // Format donations for response
    const formattedDonations = userDonations.map(d => ({
      id: d.id,
      projectId: d.projectId,
      amount: Number(d.amount),
      txHash: d.txHash,
      timestamp: d.createdAt,
      donorId: d.donorId,
      donorWalletAddress: d.donorWalletAddress
    }));

    return NextResponse.json({
      donations: formattedDonations,
      projects: validProjects,
      stats: {
        totalContributed,
        activeProjects,
        completedProjects
      }
    });

  } catch (error: any) {
    console.error('Error fetching donor dashboard:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}