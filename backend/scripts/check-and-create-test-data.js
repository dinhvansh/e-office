/**
 * Check database and create test data if needed
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndCreate() {
  try {
    console.log('🔍 Checking database...\n');

    // Check documents
    const docCount = await prisma.documents.count();
    console.log(`📄 Documents: ${docCount}`);

    // Check sign requests
    const signReqCount = await prisma.sign_requests.count();
    console.log(`✍️ Sign Requests: ${signReqCount}`);

    // Check approvals
    const approvalCount = await prisma.document_approvals.count();
    console.log(`✅ Approvals: ${approvalCount}`);

    // Check users
    const userCount = await prisma.users.count();
    console.log(`👤 Users: ${userCount}`);

    if (docCount === 0) {
      console.log('\n⚠️ No documents found!');
      console.log('💡 You need to:');
      console.log('   1. Login to http://localhost:3000');
      console.log('   2. Go to "Tài liệu" page');
      console.log('   3. Upload a document');
      console.log('   4. Add signature fields');
      console.log('   5. Send for signing');
    } else {
      console.log('\n✅ Database has data!');
      
      // Show recent documents
      const recentDocs = await prisma.documents.findMany({
        take: 5,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          created_at: true,
        },
      });

      console.log('\n📋 Recent documents:');
      recentDocs.forEach(doc => {
        console.log(`   ${doc.id}. ${doc.title} (${doc.status})`);
      });

      // Show sign requests
      const signReqs = await prisma.sign_requests.findMany({
        take: 5,
        orderBy: { created_at: 'desc' },
        include: {
          signers: true,
        },
      });

      console.log('\n✍️ Recent sign requests:');
      signReqs.forEach(sr => {
        console.log(`   ${sr.id}. Status: ${sr.status}, Signers: ${sr.signers.length}`);
      });
    }

    console.log('\n📊 Summary:');
    console.log(`   Documents: ${docCount}`);
    console.log(`   Sign Requests: ${signReqCount}`);
    console.log(`   Approvals: ${approvalCount}`);
    console.log(`   Users: ${userCount}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCreate();
