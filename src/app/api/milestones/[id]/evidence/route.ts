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

    // Validate ID is a valid positive integer
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
    const { evidenceCid, evidenceUrl, evidenceType } = body;

    // Validate evidenceCid is provided and non-empty
    if (!evidenceCid || typeof evidenceCid !== 'string' || evidenceCid.trim() === '') {
      return NextResponse.json(
        {
          error: 'evidenceCid is required and must be a non-empty string',
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
      evidenceCid: string;
      evidenceUrl?: string;
      evidenceType?: string;
      status: string;
      submittedAt: string;
    } = {
      evidenceCid: evidenceCid.trim(),
      status: 'submitted',
      submittedAt: new Date().toISOString(),
    };

    // Add optional fields if provided
    if (evidenceUrl && typeof evidenceUrl === 'string' && evidenceUrl.trim() !== '') {
      updateData.evidenceUrl = evidenceUrl.trim();
    }

    if (evidenceType && typeof evidenceType === 'string' && evidenceType.trim() !== '') {
      updateData.evidenceType = evidenceType.trim();
    }

    // Update milestone with evidence
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
    console.error('POST milestone evidence error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + error,
      },
      { status: 500 }
    );
  }
}