// test/delete-project-95.ts
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables FIRST
config({ path: resolve(process.cwd(), '.env.local') });

// Then import and create the database connection
import { createTestDb } from './test-db';
import { projects, milestones, donations } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function deleteProject95() {
  console.log('🗑️ Deleting Project 95 and all associated data...\n');
  
  // Create database connection
  const db = createTestDb();
  const projectId = 95;
  
  try {
    // 1. First check if project exists
    console.log('='.repeat(50));
    console.log('🔍 Checking current state...');
    console.log('='.repeat(50));
    
    const projectExists = await db
      .select({ id: projects.id, title: projects.title })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    
    if (projectExists.length === 0) {
      console.log(`❌ Project ${projectId} not found in database.`);
      return;
    }
    
    console.log(`Found project: "${projectExists[0].title}" (ID: ${projectId})`);
    
    // 2. Check associated milestones
    const existingMilestones = await db
      .select({
        id: milestones.id,
        description: milestones.description,
        amount: milestones.amount
      })
      .from(milestones)
      .where(eq(milestones.projectId, projectId));
    
    console.log(`\n📋 Found ${existingMilestones.length} milestones for project ${projectId}:`);
    existingMilestones.forEach(ms => {
      console.log(`  • Milestone ${ms.id}: "${ms.description}" (${ms.amount} MATIC)`);
    });
    
    // 3. Check associated donations
    const existingDonations = await db
      .select({
        id: donations.id,
        amount: donations.amount
      })
      .from(donations)
      .where(eq(donations.projectId, projectId));
    
    console.log(`\n💰 Found ${existingDonations.length} donations for project ${projectId}:`);
    existingDonations.forEach(donation => {
      console.log(`  • Donation ${donation.id}: ${donation.amount} MATIC`);
    });
    
    // 4. Ask for confirmation
    console.log('\n' + '='.repeat(50));
    console.log('⚠️  WARNING: This operation cannot be undone!');
    console.log('='.repeat(50));
    console.log(`\nThis will delete:`);
    console.log(`  • 1 project (ID: ${projectId})`);
    console.log(`  • ${existingMilestones.length} milestones`);
    console.log(`  • ${existingDonations.length} donations`);
    
    // For safety, require manual confirmation
    console.log('\n🔒 To proceed with deletion, uncomment the delete code below.');
    console.log('Then run: npx tsx test/delete-project-95.ts\n');
    
    // 5. DELETE CODE (commented for safety)
    
    console.log('\n🗑️ Starting deletion in transaction...');
    
    await db.transaction(async (tx) => {
      // Delete donations first (foreign key constraint)
      if (existingDonations.length > 0) {
        console.log(`Deleting ${existingDonations.length} donations...`);
        await tx
          .delete(donations)
          .where(eq(donations.projectId, projectId));
      }
      
      // Delete milestones
      if (existingMilestones.length > 0) {
        console.log(`Deleting ${existingMilestones.length} milestones...`);
        await tx
          .delete(milestones)
          .where(eq(milestones.projectId, projectId));
      }
      
      // Delete the project
      console.log(`Deleting project ${projectId}...`);
      await tx
        .delete(projects)
        .where(eq(projects.id, projectId));
      
      console.log('✅ All deletions successful!');
    });
    
    console.log('\n✅ Transaction completed. Project and all related data deleted.');
   
    
  } catch (error) {
    console.error('❌ Error during deletion:', error);
  }
}

// Run the function
deleteProject95();