/**
 * Fix signers user_id for internal users
 * Link internal signers to their user accounts
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing signers user_id for internal users\n');

  try {
    // 1. Find all internal signers without user_id
    const internalSigners = await prisma.signers.findMany({
      where: {
        is_internal: true,
        // user_id: null // This field doesn't exist in schema!
      }
    });

    console.log(`Found ${internalSigners.length} internal signers\n`);

    // 2. For each signer, find matching user by email
    let fixed = 0;
    for (const signer of internalSigners) {
      console.log(`Checking signer ${signer.id}: ${signer.email}`);
      
      // Find user with matching email
      const user = await prisma.users.findFirst({
        where: {
          email: signer.email,
          status: 'active'
        }
      });

      if (user) {
        console.log(`  ✅ Found user: ${user.full_name || user.email} (ID: ${user.id})`);
        
        // Update signer with user_id
        await prisma.signers.update({
          where: { id: signer.id },
          data: { user_id: user.id }
        });
        
        console.log(`  ✅ Updated signer with user_id: ${user.id}`);
        fixed++;
        
      } else {
        console.log(`  ❌ No matching user found`);
      }
    }

    console.log(`\n✅ Fixed ${fixed} signers with user_id\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
