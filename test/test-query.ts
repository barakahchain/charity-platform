// test/test-query.ts
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables FIRST
config({ path: resolve(process.cwd(), '.env.local') });

// Then import and create the database connection
import { createTestDb } from './test-db';
import { users, userWallets } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';

async function testCharityWalletQuery() {
  console.log('🧪 Testing charity wallet query...');
  console.log('Environment check:', {
    hasConnectionUrl: !!process.env.TURSO_CONNECTION_URL,
    hasAuthToken: !!process.env.TURSO_AUTH_TOKEN
  });

  // Create database connection
  const db = createTestDb();

  // First, let's check what data we have
  console.log('\n📊 Checking available data...');
  
  try {
    // Get all active wallets to choose from
    const allActiveWallets = await db
      .select({
        walletAddress: userWallets.walletAddress,
        status: userWallets.status,
        userId: userWallets.userId
      })
      .from(userWallets)
      .where(eq(userWallets.status, 'active'))
      .limit(5);

    console.log('Available active wallets:', allActiveWallets);

    if (allActiveWallets.length === 0) {
      console.log('❌ No active wallets found. Please add test data first.');
      return;
    }

    // Use the first active wallet for testing
    const testWalletAddress = allActiveWallets[0].walletAddress;
    console.log(`\n🔍 Testing with wallet: ${testWalletAddress}`);

    // Your original query
    const charityWallet = await db
      .select({
        userId: userWallets.userId,
        userWalletId: userWallets.id,
        walletAddress: userWallets.walletAddress,
        userName: users.name,
        userEmail: users.email,
        userRole: users.role,
      })
      .from(userWallets)
      .innerJoin(users, eq(userWallets.userId, users.id))
      .where(
        and(
          eq(userWallets.walletAddress, testWalletAddress),
          eq(userWallets.status, 'active')
        )
      )
      .limit(1);

    console.log('\n✅ Query executed successfully.');
    console.log('Result:', JSON.stringify(charityWallet, null, 2));

    if (charityWallet.length > 0) {
      console.log('🎉 Test passed: Found the charity user.');
    } else {
      console.log('❌ No active charity wallet found for the given address.');
      
      // Let's debug why
      const userCheck = await db
        .select()
        .from(users)
        .where(eq(users.id, allActiveWallets[0].userId))
        .limit(1);
      
      console.log('User data:', userCheck);
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error);
  }
}

// Run the test function
testCharityWalletQuery();