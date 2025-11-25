/**
 * Assign manager to creator user
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignManager() {
  console.log('🔧 Assigning Manager to Creator\n');

  try {
    // 1. Find creator
    const creator = await prisma.users.findFirst({
      where: { email: 'creator@acme.local' }
    });

    if (!creator) {
      console.log('❌ Creator not found');
      return;
    }

    console.log('✅ Creator:', creator.email);
    console.log('   ID:', creator.id);
    console.log('   Current Manager ID:', creator.manager_id || 'null');

    // 2. Find approver to be manager
    const approver = await prisma.users.findFirst({
      where: { email: 'approver@acme.local' }
    });

    if (!approver) {
      console.log('❌ Approver not found');
      return;
    }

    console.log('\n✅ Approver (will be manager):', approver.email);
    console.log('   ID:', approver.id);
    console.log('   Name:', approver.full_name);

    // 3. Update creator's manager
    console.log('\n🔄 Updating creator.manager_id...');
    const updated = await prisma.users.update({
      where: { id: creator.id },
      data: { manager_id: approver.id }
    });

    console.log('✅ Updated successfully!');
    console.log('   New Manager ID:', updated.manager_id);

    // 4. Verify
    console.log('\n🔍 Verifying...');
    const verified = await prisma.users.findUnique({
      where: { id: creator.id },
      include: {
        manager: {
          select: {
            id: true,
            email: true,
            full_name: true
          }
        }
      }
    });

    console.log('✅ Verification:');
    console.log('   Creator:', verified.email);
    console.log('   Manager:', verified.manager?.full_name || verified.manager?.email);
    console.log('   Manager Email:', verified.manager?.email);

    console.log('\n✅ Done! Now test manager approval flow');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

assignManager();
