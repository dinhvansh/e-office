const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function checkDocument74() {
  try {
    console.log('=== Checking Document 74 ===\n');

    // Check if document exists
    const document = await prisma.documents.findUnique({
      where: { id: 74 },
      include: {
        owner: {
          select: { id: true, email: true, full_name: true }
        },
        document_type: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    if (!document) {
      console.log('❌ Document 74 does NOT exist in database');
      
      // Find latest document
      const latest = await prisma.documents.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true, title: true, document_number: true }
      });
      
      if (latest) {
        console.log(`\n✅ Latest document: ID ${latest.id} - ${latest.document_number} - ${latest.title}`);
      }
      
      return;
    }

    console.log('✅ Document 74 EXISTS');
    console.log('\nDocument Details:');
    console.log('- ID:', document.id);
    console.log('- Title:', document.title);
    console.log('- Document Number:', document.document_number);
    console.log('- Status:', document.status);
    console.log('- File Path:', document.file_path);
    console.log('- Owner:', document.owner?.full_name || document.owner?.email);
    console.log('- Type:', document.document_type?.name);
    console.log('- Tenant ID:', document.tenant_id);

    // Check if file exists on disk
    if (document.file_path) {
      const fullPath = path.resolve(document.file_path);
      console.log('\nFile System Check:');
      console.log('- Full Path:', fullPath);
      
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        console.log('- ✅ File EXISTS on disk');
        console.log('- File Size:', stats.size, 'bytes');
      } else {
        console.log('- ❌ File does NOT exist on disk');
      }
    } else {
      console.log('\n❌ No file_path in database');
    }

    // Check signed file if exists
    if (document.signed_file_path) {
      console.log('\nSigned File:');
      console.log('- Path:', document.signed_file_path);
      const signedPath = path.resolve(document.signed_file_path);
      if (fs.existsSync(signedPath)) {
        const stats = fs.statSync(signedPath);
        console.log('- ✅ Signed file EXISTS');
        console.log('- File Size:', stats.size, 'bytes');
      } else {
        console.log('- ❌ Signed file does NOT exist');
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocument74();
