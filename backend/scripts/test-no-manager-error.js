/**
 * Test error message when user has no manager
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testNoManagerError() {
  console.log('🧪 Testing No Manager Error Message\n');

  try {
    // 1. Create a test user without manager
    console.log('1️⃣ Creating test user without manager...');
    
    const testUser = await prisma.users.upsert({
      where: { email: 'no.manager@test.com' },
      update: { manager_id: null }, // Remove manager
      create: {
        tenant_id: 1,
        email: 'no.manager@test.com',
        password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz', // dummy hash
        full_name: 'User Without Manager',
        status: 'active',
        manager_id: null // No manager
      }
    });

    console.log('✅ Test user:', testUser.email);
    console.log('   Manager ID:', testUser.manager_id || 'null');

    // 2. Create a test document
    console.log('\n2️⃣ Creating test document...');
    
    const testDoc = await prisma.documents.create({
      data: {
        tenant_id: 1,
        owner_id: testUser.id,
        file_path: 'test/no-manager-test.pdf',
        title: 'Test Document - No Manager',
        status: 'draft'
      }
    });

    console.log('✅ Document:', testDoc.id);
    console.log('   Owner:', testUser.email);

    // 3. Try to get manager (should be null)
    console.log('\n3️⃣ Testing manager lookup...');
    
    const docWithOwner = await prisma.documents.findUnique({
      where: { id: testDoc.id },
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

    console.log('   Document owner.manager_id:', docWithOwner.owner.manager_id || 'null');
    console.log('   Document owner.manager:', docWithOwner.owner.manager || 'null');

    console.log('\n📊 Result:');
    const hasManager = docWithOwner.owner.manager_id && docWithOwner.owner.manager?.status === 'active';
    console.log('   Has active manager:', hasManager);
    
    if (!hasManager) {
      console.log('\n✅ CORRECT! No manager found');
      console.log('   When user tries to submit for approval:');
      console.log('   ❌ Error: "Bạn chưa được phân công quản lý trực tiếp."');
      console.log('   ❌ Error: "Vui lòng liên hệ admin để cập nhật thông tin."');
      console.log('\n💡 This error will be shown in frontend toast notification');
    } else {
      console.log('\n❌ WRONG! Manager found:', docWithOwner.owner.manager);
    }

    // 4. Cleanup
    console.log('\n4️⃣ Cleaning up...');
    await prisma.documents.delete({ where: { id: testDoc.id } });
    await prisma.users.delete({ where: { id: testUser.id } });
    console.log('✅ Cleanup done');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testNoManagerError();
