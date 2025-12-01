import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID
    if (!id || isNaN(parseInt(id)) || parseInt(id) <= 0) {
      return NextResponse.json(
        {
          error: 'Valid user ID is required',
          code: 'INVALID_INPUT',
        },
        { status: 400 }
      );
    }

    const userId = parseInt(id);

    // Parse request body
    const body = await request.json();
    const { kycStatus } = body;

    // Validate kycStatus is provided
    if (!kycStatus) {
      return NextResponse.json(
        {
          error: 'kycStatus is required',
          code: 'INVALID_INPUT',
        },
        { status: 400 }
      );
    }

    // Validate kycStatus is one of allowed values
    const allowedStatuses = ['pending', 'verified', 'rejected'];
    if (!allowedStatuses.includes(kycStatus)) {
      return NextResponse.json(
        {
          error: `kycStatus must be one of: ${allowedStatuses.join(', ')}`,
          code: 'INVALID_INPUT',
        },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        {
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    // Update user's KYC status
    const updatedUser = await db
      .update(users)
      .set({
        kycStatus: kycStatus,
      })
      .where(eq(users.id, userId))
      .returning();

    return NextResponse.json(updatedUser[0], { status: 200 });
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