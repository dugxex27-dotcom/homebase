import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function grandfatherExistingContractors() {
  console.log('🔧 Starting contractor grandfathering migration...');
  
  try {
    // Get all existing contractors
    const contractors = await db
      .select()
      .from(users)
      .where(eq(users.role, 'contractor'));
    
    console.log(`Found ${contractors.length} contractors to grandfather`);
    
    // Update each contractor to grandfathered status
    for (const contractor of contractors) {
      await db
        .update(users)
        .set({
          subscriptionStatus: 'grandfathered',
          trialEndsAt: null, // Clear trial since they're grandfathered
        })
        .where(eq(users.id, contractor.id));
      
      console.log(`✅ Grandfathered contractor: ${contractor.email}`);
    }
    
    console.log(`\n✅ Successfully grandfathered ${contractors.length} contractors`);
    console.log('These contractors now have unlimited access with no billing requirements.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
grandfatherExistingContractors()
  .then(() => {
    console.log('\n🎉 Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
