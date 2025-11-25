/**
 * Quick Backend Test - Approval Workflow
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function quickTest() {
  console.log('🧪 Quick Backend Test\n');

  try {
    // 1. Check accounts
    const creator = await prisma.users.findFirst({
      where: { email: 'creator@acme.local' }
    });
    
    const approver = await prisma.users.findFirst({
      where: { email: 'approver@acme.local' }
    });

    console.log('✅ Creator:', creator?.email || 'NOT FOUND');
    console.log('✅ Approver:', approver?.email || 'NOT FOUND');

    if (!creator || !approver) {
      console.log('\n❌ Run: node scripts/create-approval-test-users.js');
      return;
    }

    // 2. Check document
    const document = await prisma.documents.findFirst({
      where: { 
        owner_id: creator.id,
        status: 'pending_approval'
      },
      orderBy: { created_at: 'desc' }
    });

    console.log('\n✅ Document:', document?.id || 'NOT FOUND');
    if (document) {
      console.log('   Title:', document.title);
      console.log('   Status:', document.status);
      console.log('   File:', document.file_path);
    }

    // 3. Check approval
    if (document) {
      const approval = await prisma.document_approvals.findFirst({
        where: {
          document_id: document.id,
          approver_user_id: approver.id
        }
      });

      console.log('\n✅ Approval:', approval?.id || 'NOT FOUND');
      if (approval) {
        console.log('   Status:', approval.status);
      }
    }

    // 4. Check file exists
    if (document) {
      const fs = require('fs');
      const path = require('path');
      
      const filePath = path.join(process.cwd(), document.file_path);
      const exists = fs.existsSync(filePath);
      
      console.log('\n✅ File exists:', exists ? 'YES' : 'NO');
      console.log('   Path:', filePath);
    }

    console.log('\n✅ Backend test complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

quickTest();
