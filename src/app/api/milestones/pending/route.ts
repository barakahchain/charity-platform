import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { milestones } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters with validation
    const status = searchParams.get('status') || 'submitted';
    const projectId = searchParams.get('projectId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate limit and offset
    if (isNaN(limit) || limit < 1) {
      return NextResponse.json({
        error: 'Limit must be a positive integer',
        code: 'INVALID_INPUT'
      }, { status: 400 });
    }

    if (isNaN(offset) || offset < 0) {
      return NextResponse.json({
        error: 'Offset must be a non-negative integer',
        code: 'INVALID_INPUT'
      }, { status: 400 });
    }

    // Validate status value
    const validStatuses = ['pending', 'submitted', 'verified', 'rejected', 'paid'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        code: 'INVALID_INPUT'
      }, { status: 400 });
    }

    // Build query conditions
    const conditions = [eq(milestones.status, status)];

    // Add projectId filter if provided
    if (projectId) {
      const parsedProjectId = parseInt(projectId);
      if (isNaN(parsedProjectId)) {
        return NextResponse.json({
          error: 'Project ID must be a valid integer',
          code: 'INVALID_INPUT'
        }, { status: 400 });
      }
      conditions.push(eq(milestones.projectId, parsedProjectId));
    }

    // Execute query with filters, pagination, and ordering
    const results = await db.select()
      .from(milestones)
      .where(and(...conditions))
      .orderBy(desc(milestones.submittedAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}