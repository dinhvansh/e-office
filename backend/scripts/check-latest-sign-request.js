const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLatest() {
  try {
    console.log('🔍 Checking Latest Sign Request...\n');

    const signRequest = await prisma.sign_requests.findFirst({
      where: { status: 'draft' },
      include: {
        document: true,
        signers: true
      },
      orderBy: { created_at: 'desc' }
    });

    if (!signRequest) {
      console.log('❌ No draft sign request found');
      return;
    }

    console.log('📋 Latest Draft Sign Request:');
    console.log('  ID:', signRequest.id);
    console.log('  Document ID:', signRequest.document_id);
    console.log('  Document exists:', !!signRequest.document);
    console.log('  Status:', signRequest.status);
    console.log('  Created:', signRequest.created_at);
    console.log('');

    if (signRequest.document) {
      console.log('📄 Document:');
      console.log('  Title:', signRequest.document.title || 'N/A');
      console.log('  File:', signRequest.document.original_file_name || signRequest.document.file_path);
      console.log('  Status:', signRequest.document.status);
    } else {
      console.log('❌ Document NOT FOUND!');
      console.log('   This will cause 500 error when sending!');
    }
    console.log('');

    console.log('👥 Signers:', signRequest.signers.length);
    signRequest.signers.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.name} (${s.email})`);
      console.log(`     Order: ${s.signing_order}, Internal: ${s.is_internal}, User ID: ${s.user_id || 'N/A'}`);
    });
    console.log('');

    console.log('🎯 Editor URL:');
    console.log(`   http://localhost:3000/sign-requests/${signRequest.id}/editor`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkLatest();
