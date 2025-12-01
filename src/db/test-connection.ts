import { db } from '@/db';
import { users, userWallets, projects, donations } from '@/db/schema';
import { sql } from 'drizzle-orm';

export class DatabaseTestService {
  static async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      console.log('🔗 Testing Turso database connection...');
      
      // Test 1: Basic connection test with Turso-compatible SQL
      const result = await db.run(sql`SELECT 1 as test_value`);
      console.log('✅ Basic connection test passed');
      
      // Test 2: Check if tables exist (Turso-compatible query)
      const tablesResult = await db.run(
        sql`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
      );
      
      const tableNames = (tablesResult.rows as any[]).map(row => row.name);
      console.log('📊 Available tables:', tableNames);
      
      // Test 3: Test basic CRUD operations
      await this.testCRUDOperations();
      
      // Test 4: Test relationships
      await this.testRelationships();
      
      return {
        success: true,
        details: {
          tables: tableNames,
          message: 'All Turso database tests passed successfully',
          turso: true
        }
      };
      
    } catch (error: any) {
      console.error('❌ Turso database connection test failed:', error);
      return {
        success: false,
        error: error.message,
        details: {
          turso: true,
          error: error.toString()
        }
      };
    }
  }

  private static async testCRUDOperations() {
    const testData = {
      userId: 0,
      projectId: 0,
      donationId: 0,
      walletAddress: `0xTestWallet${Date.now()}`
    };

    try {
      // Create a test user
      const [testUser] = await db.insert(users).values({
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
        password: 'test-password',
        role: 'donor',
        kycStatus: 'pending',
        createdAt: new Date().toISOString(),
      }).returning();

      testData.userId = testUser.id;
      console.log('✅ User creation test passed');

      // Create a test wallet for the user
      const [testWallet] = await db.insert(userWallets).values({
        userId: testUser.id,
        walletAddress: testData.walletAddress,
        isPrimary: true,
        status: 'active',
        createdAt: new Date().toISOString(),
      }).returning();

      console.log('✅ Wallet creation test passed');

      // Create a test project
      const [testProject] = await db.insert(projects).values({
        charityId: testUser.id,
        title: 'Test Project',
        description: 'A test project for database validation',
        metaCid: 'test-cid',
        zakatMode: false,
        contractTemplate: 'Wakālah',
        totalAmount: 1000.0,
        fundedBalance: 0,
        status: 'active',
        contractAddress: `0xTestProject${Date.now()}`,
        createdAt: new Date().toISOString(),
      }).returning();

      testData.projectId = testProject.id;
      console.log('✅ Project creation test passed');

      // Create a test donation
      const [testDonation] = await db.insert(donations).values({
        projectId: testProject.id,
        donorId: testUser.id,
        donorWalletAddress: testWallet.walletAddress,
        amount: 100.0,
        txHash: `0xTestTx${Date.now()}`,
        blockNumber: 123456,
        createdAt: new Date().toISOString(),
      }).returning();

      testData.donationId = testDonation.id;
      console.log('✅ Donation creation test passed');

      // Test reading data
      const foundDonation = await db.select()
        .from(donations)
        .where(sql`id = ${testDonation.id}`)
        .get();

      if (!foundDonation) {
        throw new Error('Failed to read donation');
      }

      console.log('✅ Data reading test passed');

      // Clean up test data
      await this.cleanupTestData(testData);

      console.log('✅ All CRUD operations test passed');

    } catch (error) {
      // Attempt to clean up even if test fails
      await this.cleanupTestData(testData);
      console.error('❌ CRUD operations test failed:', error);
      throw error;
    }
  }

  private static async testRelationships() {
    try {
      // Test user-wallet relationship
      const userWithWallets = await db
        .select({
          user: users,
          wallet: userWallets,
        })
        .from(users)
        .leftJoin(userWallets, sql`${userWallets.userId} = ${users.id}`)
        .limit(1)
        .get();

      console.log('✅ User-wallet relationship test passed');

      // Test project-donation relationship
      const projectWithDonations = await db
        .select({
          project: projects,
          donation: donations,
        })
        .from(projects)
        .leftJoin(donations, sql`${donations.projectId} = ${projects.id}`)
        .limit(1)
        .get();

      console.log('✅ Project-donation relationship test passed');

    } catch (error) {
      console.error('❌ Relationship test failed:', error);
      throw error;
    }
  }

  private static async cleanupTestData(testData: { userId: number; projectId: number; donationId: number; walletAddress: string }) {
    try {
      // Delete in correct order to respect foreign key constraints
      if (testData.donationId > 0) {
        await db.delete(donations).where(sql`id = ${testData.donationId}`);
      }
      
      if (testData.projectId > 0) {
        await db.delete(projects).where(sql`id = ${testData.projectId}`);
      }
      
      if (testData.userId > 0) {
        // Delete wallet first due to foreign key constraint
        await db.delete(userWallets).where(sql`user_id = ${testData.userId}`);
        await db.delete(users).where(sql`id = ${testData.userId}`);
      }
      
      console.log('🧹 Test data cleaned up successfully');
    } catch (error) {
      console.error('❌ Failed to clean up test data:', error);
    }
  }

  static async getDatabaseStats() {
    try {
      const stats = {
        users: await db.select().from(users).all().then(rows => rows.length),
        userWallets: await db.select().from(userWallets).all().then(rows => rows.length),
        projects: await db.select().from(projects).all().then(rows => rows.length),
        donations: await db.select().from(donations).all().then(rows => rows.length),
      };

      console.log('📈 Database Statistics:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Failed to get database stats:', error);
      return null;
    }
  }

  static async testTursoSpecificFeatures() {
    try {
      // Test Turso-specific features
      console.log('🧪 Testing Turso-specific features...');
      
      // Test transaction (if supported)
      const result = await db.batch([
        db.select().from(users).limit(1),
        db.select().from(projects).limit(1),
      ]);
      
      console.log('✅ Batch operations test passed');
      
      return {
        success: true,
        batchOperations: true,
        message: 'Turso-specific features test passed'
      };
    } catch (error) {
      console.error('❌ Turso-specific features test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}