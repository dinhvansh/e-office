const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSignRequest() {
  console.log('🔍 Kiểm tra Sign Request #44...\n');

  try {
    const signRequest = await prisma.sign_requests.findUnique({
      where: { id: 44 },
      include: {
        document: {
          include: {
            owner: true,
            document_type: true
          }
        },
        signers: {
          include: {
            user: true
          },
          orderBy: {
            signing_order: 'asc'
          }
        },
        fields: true
      }
    });

    if (!signRequest) {
      console.log('❌ Sign Request #44 không tồn tại');
      return;
    }

    console.log('📋 SIGN REQUEST INFO');
    console.log('═══════════════════════════════════════');
    console.log(`ID: ${signRequest.id}`);
    console.log(`Title: ${signRequest.title}`);
    console.log(`Status: ${signRequest.status}`);
    console.log(`Workflow Type: ${signRequest.workflow_type}`);
    console.log(`Document ID: ${signRequest.document_id}`);
    console.log(`Created: ${signRequest.created_at}`);

    console.log('\n📄 DOCUMENT INFO');
    console.log('═══════════════════════════════════════');
    if (signRequest.document) {
      console.log(`ID: ${signRequest.document.id}`);
      console.log(`Number: ${signRequest.document.document_number}`);
      console.log(`Title: ${signRequest.document.title}`);
      console.log(`Status: ${signRequest.document.status}`);
      console.log(`File Path: ${signRequest.document.file_path}`);
      console.log(`Signed File: ${signRequest.document.signed_file_path || 'Chưa có'}`);
      console.log(`Owner: ${signRequest.document.owner?.full_name || 'N/A'} (${signRequest.document.owner?.email || 'N/A'})`);
      
      // Check if file exists
      const fs = require('fs');
      const path = require('path');
      const filePath = path.resolve(process.cwd(), signRequest.document.file_path);
      const fileExists = fs.existsSync(filePath);
      console.log(`File exists: ${fileExists ? '✅ YES' : '❌ NO'}`);
      if (fileExists) {
        const stats = fs.statSync(filePath);
        console.log(`File size: ${(stats.size / 1024).toFixed(2)} KB`);
      } else {
        console.log(`Expected path: ${filePath}`);
      }
    } else {
      console.log('❌ Document not found');
    }

    console.log('\n👥 SIGNERS');
    console.log('═══════════════════════════════════════');
    if (signRequest.signers.length === 0) {
      console.log('❌ No signers');
    } else {
      signRequest.signers.forEach((signer, index) => {
        console.log(`\n${index + 1}. ${signer.is_internal ? '👤 Internal' : '📧 External'}`);
        if (signer.is_internal && signer.user) {
          console.log(`   Name: ${signer.user.full_name}`);
          console.log(`   Email: ${signer.user.email}`);
          console.log(`   User ID: ${signer.user_id}`);
        } else {
          console.log(`   Name: ${signer.name}`);
          console.log(`   Email: ${signer.email}`);
        }
        console.log(`   Order: ${signer.signing_order}`);
        console.log(`   Role: ${signer.role}`);
        console.log(`   Status: ${signer.status}`);
        console.log(`   Signed: ${signer.signed_at || 'Not yet'}`);
      });
    }

    console.log('\n📝 FIELDS');
    console.log('═══════════════════════════════════════');
    console.log(`Total fields: ${signRequest.fields.length}`);
    if (signRequest.fields.length > 0) {
      signRequest.fields.forEach((field, index) => {
        console.log(`\n${index + 1}. ${field.type}`);
        console.log(`   Page: ${field.page}`);
        console.log(`   Position: (${field.x}, ${field.y})`);
        console.log(`   Size: ${field.width}x${field.height}`);
        console.log(`   Assigned to signer: ${field.assigned_signer_id || 'None'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSignRequest();
