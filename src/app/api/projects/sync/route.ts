// app/api/projects/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, users, userWallets } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, goal, deadline, completed, charity, builder, totalDonated, deadlineEnabled, metadata } = body;

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
          name: `Charity ${charity.slice(0, 8)}`,
          email: `${charity.slice(0, 8)}@onchain.charity`,
          password: 'onchain-generated', // You might want a better approach
          role: 'charity',
          kycStatus: 'pending',
          createdAt: new Date().toISOString(),
        })
        .returning();

      // Create wallet entry for the charity
      await db.insert(userWallets).values({
        userId: newUser[0].id,
        walletAddress: charity,
        isPrimary: true,
        status: 'active',
        createdAt: new Date().toISOString(),
      });

      charityId = newUser[0].id;
    } else {
      charityId = charityUser[0].users.id;
    }

    // Check if project exists in DB by address
    const existingProject = await db
      .select()
      .from(projects)
      .where(eq(projects.contractAddress, address))
      .limit(1);

    const projectData = {
      contractAddress: address,
      walletAddress: charity, // Use the charity address as wallet address
      title: metadata?.title || `On-Chain Project ${address.slice(0, 8)}`,
      description: metadata?.description || "Project created directly on-chain",
      totalAmount: Number(goal) / 1e18,
      fundedBalance: Number(totalDonated) / 1e18,
      status: completed ? "completed" : deadlineEnabled && Number(deadline) * 1000 < Date.now() ? "expired" : "active",
      contractTemplate: metadata?.contractTemplate || "unknown",
      zakatMode: metadata?.type === "zakat",
      asnafTag: metadata?.asnafCategory,
      metaCid: metadata ? metadata.metaCid : "", // Provide empty string instead of null
      deadline: deadline ? new Date(Number(deadline) * 1000).toISOString() : null,
      deadlineEnabled: deadlineEnabled,
      updatedAt: new Date().toISOString(),
    };

    if (existingProject.length > 0) {
      // Update existing project
      await db
        .update(projects)
        .set({
          ...projectData,
          charityId, // Update charityId too
        })
        .where(eq(projects.id, existingProject[0].id));
      
      return NextResponse.json({ 
        success: true, 
        message: 'Project updated',
        project: { id: existingProject[0].id, charityId, ...projectData }
      });
    } else {
      // Create new project with the found/created charityId
      const newProject = await db
        .insert(projects)
        .values({
          ...projectData,
          charityId,
          createdAt: new Date().toISOString(),
        })
        .returning();
      
      return NextResponse.json({ 
        success: true, 
        message: 'Project created',
        project: newProject[0]
      });
    }
  } catch (error) {
    console.error('Error syncing project:', error);
    return NextResponse.json(
      { error: 'Failed to sync project' },
      { status: 500 }
    );
  }
}