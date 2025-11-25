/**
 * Simple test - Manager lookup in getApproversForStep
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testManagerLookup() {
  console.log('🧪 Testing Manager Lookup\n');

  try {
    // 1. Get creator and their manager
    const creator = await prisma.users.findFirst({
      where: { email: 'creator@acme.local' },
      include: { manager: true }
    });

    console.log('✅ Creator:', creator.email);
    console.log('   Manager ID:', creator.manager_id);
    console.log('   Manager:', creator.manager?.email);

    // 2. Get test document owned by creator
    const document = await prisma.documents.findFirst({
      where: { owner_id: creator.id },
      orderBy: { created_at: 'desc' }
    });

    console.log('\n✅ Document:', document.id);
    console.log('   Owner ID:', document.owner_id);

    // 3. Get HOPDONG workflow manager step
    const workflow = await prisma.workflows.findFirst({
      where: { name: 'HOPDONG' },
      include: { steps: true }
    });

    const managerStep = workflow.steps.find(s => s.approver_type === 'manager');
    console.log('\n✅ Manager Step:', managerStep.step_name);
    console.log('   ID:', managerStep.id);

    // 4. Test the lookup logic directly
    console.log('\n🔍 Testing lookup logic...');
    
    const doc = await prisma.documents.findUnique({
      where: { id: document.id },
      select: {
        owner: {
          select: {
            manager_id: true,
            manager: {
              select: {
                id: true,
                email: true,
                full_name: true,
                status: true
              }
            }
          }
        }
      }
    });

    console.log('   Document owner.manager_id:', doc.owner.manager_id);
    console.log('   Document owner.manager:', doc.owner.manager?.email);
    console.log('   Manager status:', doc.owner.manager?.status);

    if (doc.owner.manager_id && doc.owner.manager?.status === 'active') {
      console.log('\n✅ SUCCESS! Manager found:', doc.owner.manager_id);
      console.log('   Email:', doc.owner.manager.email);
      console.log('   Name:', doc.owner.manager.full_name);
    } else {
      console.log('\n❌ FAILED! No active manager found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testManagerLookup();
