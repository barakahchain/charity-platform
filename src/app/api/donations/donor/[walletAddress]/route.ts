import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { donations } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { walletAddress: string } }
) {
  try {
    const { walletAddress } = params;
    const { searchParams } = new URL(request.url);

    // Validate wallet address
    if (!walletAddress || walletAddress.trim() === '') {
      return NextResponse.json(
        {
          error: 'Valid wallet address is required',
          code: 'INVALID_WALLET',
        },
        { status: 400 }
      );
    }

    // Parse pagination parameters
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '50'),
      100
    );
    const offset = parseInt(searchParams.get('offset') || '0');

    // Query donations by wallet address with pagination
    const results = await db
      .select()
      .from(donations)
      .where(eq(donations.donorWalletAddress, walletAddress))
      .orderBy(desc(donations.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET donations by wallet error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + error,
      },
      { status: 500 }
    );
  }
}