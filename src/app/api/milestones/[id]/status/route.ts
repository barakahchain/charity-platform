import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { milestones } from '@/db/schema';
import { eq } from 'drizzle-orm';

const VALID_STATUSES = ['pending', 'submitted', 'verified', 'rejected', 'paid'] as const;
type MilestoneStatus = typeof VALID_STATUSES[number];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID
    const milestoneId = parseInt(id);
    if (!id || isNaN(milestoneId) || milestoneId <= 0) {
      return NextResponse.json(
        {
          error: 'Valid milestone ID is required',
          code: 'INVALID_INPUT',
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { status, blockchainTxHash } = body;

    // Validate status is provided
    if (!status) {
      return NextResponse.json(
        {
          error: 'Status is required',
          code: 'INVALID_INPUT',
        },
        { status: 400 }
      );
    }

    // Validate status is one of allowed values
    if (!VALID_STATUSES.includes(status as MilestoneStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
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

    // Prepare update data
    const updateData: {
      status: string;
      blockchainTxHash?: string | null;
      submittedAt?: string;
      verifiedAt?: string;
    } = {
      status,
    };

    // Include blockchainTxHash if provided
    if (blockchainTxHash !== undefined) {
      updateData.blockchainTxHash = blockchainTxHash || null;
    }

    // Set timestamps based on status transitions
    const currentTime = new Date().toISOString();
    if (status === 'submitted' && existingMilestone[0].status === 'pending') {
      updateData.submittedAt = currentTime;
    }
    if (status === 'verified' && existingMilestone[0].status === 'submitted') {
      updateData.verifiedAt = currentTime;
    }

    // Update milestone
    const updatedMilestone = await db
      .update(milestones)
      .set(updateData)
      .where(eq(milestones.id, milestoneId))
      .returning();

    if (updatedMilestone.length === 0) {
      return NextResponse.json(
        {
          error: 'Failed to update milestone',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedMilestone[0], { status: 200 });
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + error,
      },
      { status: 500 }
    );
  }
}