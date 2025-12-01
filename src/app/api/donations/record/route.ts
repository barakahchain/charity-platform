import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { donations } from '@/db/schema';
import { projects } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { projectAddress, donorWalletAddress, amount, txHash, blockNumber } = await request.json();
    console.log('Recording donation:', { projectAddress, donorWalletAddress, amount, txHash, blockNumber });
    // Find project by contract address
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.contractAddress, projectAddress))
      .get();

    if (!project) {
        console.log('Project not found for address:', projectAddress);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Insert donation record
    const donation = await db.insert(donations).values({
      projectId: project.id,
      donorWalletAddress,
      amount,
      txHash,
      blockNumber,
      createdAt: new Date().toISOString(),
    }).returning();
    
    console.log('Donation recorded:', donation);

    return NextResponse.json({ success: true, donation });

  } catch (error: any) {
    console.error('Error recording donation:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}