/**
 * Debug PDF load error in approval page
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function debugPDFLoadError() {
  console.log('🔍 Debugging PDF load error...\n');

  try {
    // Get latest document
    const doc = await prisma.documents.findFirst({
      orderBy: { id: 'desc' },
      include: {
        owner: { select: { email: true, full_name: true } },
        document_type: { select: { name: true, code: true } }
      }
    });

    if (!doc) {
      console.log('❌ No documents found');
      return;
    }

    console.log('📄 Latest Document:');
    console.log(`   ID: ${doc.id}`);
    console.log(`   Number: ${doc.document_number}`);
    console.log(`   Title: ${doc.title}`);
    console.log(`   Type: ${doc.document_type?.name}`);
    console.log(`   Owner: ${doc.owner?.full_name || doc.owner?.email}`);
    console.log(`   Status: ${doc.status}`);
    console.log('');

    console.log('📁 File Information:');
    console.log(`   File Path (DB): ${doc.file_path}`);
    console.log(`   Original Name: ${doc.original_file_name}`);
    console.log('');

    // Check if file exists
    const projectRoot = path.resolve(__dirname, '../..');
    const fullPath = path.join(projectRoot, doc.file_path);
    
    console.log('🔍 File System Check:');
    console.log(`   Project Root: ${projectRoot}`);
    console.log(`   Full Path: ${fullPath}`);
    console.log(`   File Exists: ${fs.existsSync(fullPath) ? '✅ YES' : '❌ NO'}`);
    
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      console.log(`   File Size: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`   Created: ${stats.birthtime}`);
    }
    console.log('');

    // Check approval
    const approval = await prisma.document_approvals.findFirst({
      where: { document_id: doc.id },
      include: {
        approver: { select: { email: true, full_name: true } },
        workflow_step: { select: { step_name: true } }
      },
      orderBy: { id: 'desc' }
    });

    if (approval) {
      console.log('✅ Approval Found:');
      console.log(`   ID: ${approval.id}`);
      console.log(`   Step: ${approval.workflow_step?.step_name}`);
      console.log(`   Approver: ${approval.approver?.full_name || approval.approver?.email}`);
      console.log(`   Status: ${approval.action || 'pending'}`);
      console.log('');
      console.log(`📍 Approval URL: http://localhost:3000/approvals/${approval.id}`);
    } else {
      console.log('⚠️  No approval found for this document');
    }
    console.log('');

    // Check API endpoint
    console.log('🔗 Expected API Endpoints:');
    console.log(`   View: GET /api/v1/documents/${doc.id}/view`);
    console.log(`   Download: GET /api/v1/documents/${doc.id}/download`);
    console.log('');

    // Check path format
    console.log('⚠️  Potential Issues:');
    if (doc.file_path.startsWith('/uploads/')) {
      console.log('   ❌ Path starts with /uploads/ (legacy format)');
      console.log('   ✅ Should be: storage/tenant_id/filename');
    } else if (doc.file_path.startsWith('storage/')) {
      console.log('   ✅ Path format looks correct');
    } else {
      console.log('   ⚠️  Unexpected path format');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugPDFLoadError();
