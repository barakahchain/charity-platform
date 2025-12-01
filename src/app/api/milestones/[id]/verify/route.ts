import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { milestones } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID is a valid integer
    if (!id || isNaN(parseInt(id)) || parseInt(id) <= 0) {
      return NextResponse.json(
        {
          error: 'Valid milestone ID is required',
          code: 'INVALID_INPUT',
        },
        { status: 400 }
      );
    }

    const milestoneId = parseInt(id);

    // Parse request body
    const body = await request.json();
    const { approved, verifierId, verificationNotes, blockchainTxHash } = body;

    // Validate approved is a boolean
    if (typeof approved !== 'boolean') {
      return NextResponse.json(
        {
          error: 'approved field must be a boolean',
          code: 'INVALID_INPUT',
        },
        { status: 400 }
      );
    }

    // Validate verifierId is required and is a positive integer
    if (!verifierId || typeof verifierId !== 'number' || verifierId <= 0) {
      return NextResponse.json(
        {
          error: 'verifierId must be a positive integer',
          code: 'INVALID_INPUT',
        },
        { status: 400 }
      );
    }

    // Validate optional fields if provided
    if (verificationNotes !== undefined && typeof verificationNotes !== 'string') {
      return NextResponse.json(
        {
          error: 'verificationNotes must be a string',
          code: 'INVALID_INPUT',
        },
        { status: 400 }
      );
    }

    if (blockchainTxHash !== undefined && typeof blockchainTxHash !== 'string') {
      return NextResponse.json(
        {
          error: 'blockchainTxHash must be a string',
          code: 'INVALID_INPUT',
        },
        { status: 400 }
      );
    }

    // Check if milestone exists
    const existingMilestone = await db
      .select()
      .from(milestones)
      .where(eq(milestones.id, milestoneId))
      .limit(1);

    if (existingMilestone.length === 0) {
      return NextResponse.json(
        {
          error: 'Milestone not found',
        },
        { status: 404 }
      );
    }

    // Determine status based on approval
    const newStatus = approved ? 'verified' : 'rejected';

    // Prepare update data
    const updateData: {
      status: string;
      verifierId: number;
      verifiedAt: string;
      verificationNotes?: string;
      blockchainTxHash?: string;
    } = {
      status: newStatus,
      verifierId: verifierId,
      verifiedAt: new Date().toISOString(),
    };

    // Add optional fields if provided
    if (verificationNotes) {
      updateData.verificationNotes = verificationNotes.trim();
    }

    if (blockchainTxHash) {
      updateData.blockchainTxHash = blockchainTxHash.trim();
    }

    // Update milestone
    const updatedMilestone = await db
      .update(milestones)
      .set(updateData)
      .where(eq(milestones.id, milestoneId))
      .returning();

    return NextResponse.json(updatedMilestone[0], { status: 200 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + error,
      },
      { status: 500 }
    );
  }
}