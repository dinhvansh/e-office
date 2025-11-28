/**
 * Find Documents Without Sign Requests
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findDocumentsWithoutSignRequests() {
  console.log('\n🔍 Finding documents without sign requests...\n');
  
  try {
    // Get admin user
    const admin = await prisma.users.findFirst({
      where: { email: 'admin@acme.local' },
      select: { id: true, email: true }
    });
    
    if (!admin) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log(`👤 Admin ID: ${admin.id}\n`);
    
    // Get all documents owned by admin
    const allDocuments = await prisma.documents.findMany({
      where: {
        owner_id: admin.id
      },
      select: {
        id: true,
        document_number: true,
        title: true,
        original_file_name: true,
        status: true,
        created_at: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    
    console.log(`📄 Total documents owned by admin: ${allDocuments.length}\n`);
    
    // Check which ones have sign requests
    const documentsWithoutSignRequests = [];
    
    for (const doc of allDocuments) {
      const signRequest = await prisma.sign_requests.findFirst({
        where: {
          document_id: doc.id
        }
      });
      
      if (!signRequest) {
        documentsWithoutSignRequests.push(doc);
      }
    }
    
    console.log(`❌ Documents WITHOUT sign requests: ${documentsWithoutSignRequests.length}\n`);
    
    if (documentsWithoutSignRequests.length > 0) {
      documentsWithoutSignRequests.forEach((doc, index) => {
        console.log(`${index + 1}. ${doc.document_number || doc.title || doc.original_file_name}`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   Status: ${doc.status}`);
        console.log(`   Created: ${doc.created_at}`);
        console.log('');
      });
      
      // Check if TEST-MIXED is in the list
      const testMixed = documentsWithoutSignRequests.find(d => 
        d.document_number === 'TEST-MIXED-1764229797824'
      );
      
      if (testMixed) {
        console.log('✅ TEST-MIXED-1764229797824 is in the list (no sign request)');
        console.log('   This document should NOT appear in /sign-requests page');
        console.log('   It should only appear in /documents page');
      }
    }
    
    // Also show documents WITH sign requests
    const documentsWithSignRequests = allDocuments.length - documentsWithoutSignRequests.length;
    console.log(`\n✅ Documents WITH sign requests: ${documentsWithSignRequests}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findDocumentsWithoutSignRequests();
