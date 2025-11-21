const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();

async function updateOldDocuments() {
  try {
    console.log('🔄 Updating old documents with original_file_name...\n');

    // Find documents without original_file_name
    const documents = await prisma.documents.findMany({
      where: {
        original_file_name: null,
      },
    });

    console.log(`Found ${documents.length} documents to update\n`);

    let updated = 0;
    for (const doc of documents) {
      // Extract filename from file_path
      const fileName = path.basename(doc.file_path);
      
      await prisma.documents.update({
        where: { id: doc.id },
        data: { original_file_name: fileName },
      });

      console.log(`✅ Updated doc ${doc.id}: ${fileName}`);
      updated++;
    }

    console.log(`\n✅ Updated ${updated} documents`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateOldDocuments();
