// app/api/donations/record/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { donations, projects, userWallets } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  let body: any = undefined;
  try {
    body = await request.json();
    const { projectAddress, donorId, donorWalletAddress, amount, txHash, blockNumber } = body;
    
    console.log('Recording donation:', { projectAddress, donorId, donorWalletAddress, amount, txHash, blockNumber });

    // Validate required fields
    if (!projectAddress || !donorWalletAddress || !amount || !txHash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if donation with this txHash already exists FIRST
    const existingDonation = await db
      .select()
      .from(donations)
      .where(eq(donations.txHash, txHash))
      .get();

    if (existingDonation) {
      console.log('Donation already exists with txHash:', txHash);
      return NextResponse.json({ 
        success: true, 
        donation: existingDonation,
        message: 'Donation was already recorded previously'
      }, { status: 200 }); // Return 200 instead of error since it's already saved
    }

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

    // If donorId is provided, verify the wallet belongs to this user
    if (donorId) {
      const userWallet = await db
        .select()
        .from(userWallets)
        .where(
          and(
            eq(userWallets.userId, donorId),
            eq(userWallets.walletAddress, donorWalletAddress),
            eq(userWallets.status, 'active')
          )
        )
        .get();

      if (!userWallet) {
        console.log('Wallet not found or not active for user:', { donorId, donorWalletAddress });
        // Continue anyway for now, but log the warning
      }
    }

    // Use a transaction to ensure both operations succeed or fail together
    const result = await db.transaction(async (tx) => {
      // Insert donation record
      const donation = await tx.insert(donations).values({
        projectId: project.id,
        donorId: donorId || null, // Allow null for anonymous donations
        donorWalletAddress,
        amount,
        txHash,
        blockNumber,
        createdAt: new Date().toISOString(),
      }).returning();

      // Update project's funded balance
      await tx.update(projects)
        .set({ 
          fundedBalance: Number(project.fundedBalance) + Number(amount),
          updatedAt: new Date().toISOString()
        })
        .where(eq(projects.id, project.id));

      return donation;
    });
    
    console.log('Donation recorded successfully:', result);

    return NextResponse.json({ 
      success: true, 
      donation: result,
      message: 'Donation recorded and project funded balance updated'
    });

  } catch (error: any) {
    console.error('Error recording donation:', error);
    
    // Check for duplicate transaction (extra safety check)
    if (error.message?.includes('UNIQUE constraint failed') || 
        error.message?.includes('SQLITE_CONSTRAINT') ||
        error.code === 'SQLITE_CONSTRAINT') {
      
      // Try to get the existing donation
      const existingDonation = await db
        .select()
        .from(donations)
        .where(eq(donations.txHash, body?.txHash))
        .get();
      
      if (existingDonation) {
        return NextResponse.json({ 
          success: true, 
          donation: existingDonation,
          warning: 'Donation was already recorded previously (found during error handling)'
        }, { status: 200 });
      }
      
      return NextResponse.json({ 
        error: 'Transaction already recorded',
        code: 'DUPLICATE_TRANSACTION',
        details: 'This transaction hash has already been recorded in the database'
      }, { status: 409 });
    }
    
    return NextResponse.json({ 
      error: error.message || 'Failed to record donation',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}