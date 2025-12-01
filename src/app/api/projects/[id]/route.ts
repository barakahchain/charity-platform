import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, milestones } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const projectId = parseInt(id);

    // Fetch project
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (project.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Fetch all milestones for this project
    const projectMilestones = await db
      .select()
      .from(milestones)
      .where(eq(milestones.projectId, projectId));

    // Return project with nested milestones
    return NextResponse.json(
      {
        ...project[0],
        milestones: projectMilestones,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const projectId = parseInt(id);

    // Parse request body
    const body = await request.json();
    const { status, metaCid, blockchainTxHash, fundedBalance } = body;

    // Validate status if provided
    if (status !== undefined) {
      const validStatuses = ['active', 'completed', 'paused'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          {
            error: 'Invalid status. Must be one of: active, completed, paused',
            code: 'INVALID_STATUS',
          },
          { status: 400 }
        );
      }
    }

    // Validate fundedBalance if provided
    if (fundedBalance !== undefined) {
      if (typeof fundedBalance !== 'number' || fundedBalance < 0) {
        return NextResponse.json(
          {
            error: 'Funded balance must be a non-negative number',
            code: 'INVALID_FUNDED_BALANCE',
          },
          { status: 400 }
        );
      }
    }

    // Check if project exists
    const existingProject = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (existingProject.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updateData: any = {};

    if (status !== undefined) {
      updateData.status = status;
    }
    if (metaCid !== undefined) {
      updateData.metaCid = metaCid;
    }
    if (blockchainTxHash !== undefined) {
      updateData.blockchainTxHash = blockchainTxHash;
    }
    if (fundedBalance !== undefined) {
      updateData.fundedBalance = fundedBalance;
    }

    // Update project
    const updated = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, projectId))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const projectId = parseInt(id);

    // Check if project exists
    const existingProject = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (existingProject.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // First delete all associated milestones
    await db.delete(milestones).where(eq(milestones.projectId, projectId));

    // Then delete the project
    await db.delete(projects).where(eq(projects.id, projectId));

    return NextResponse.json(
      {
        message: 'Project and associated milestones deleted successfully',
        deletedProjectId: projectId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}