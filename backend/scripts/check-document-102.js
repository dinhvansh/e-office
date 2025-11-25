const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function checkDocument() {
  try {
    const doc = await prisma.documents.findUnique({
      where: { id: 102 }
    });

    console.log('📄 Document 102:');
    console.log(JSON.stringify(doc, null, 2));

    if (doc) {
      console.log('\n📁 File path:', doc.file_path);
      
      // Check if file exists
      const fullPath = path.join(__dirname, '../../', doc.file_path);
      console.log('📂 Full path:', fullPath);
      
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        console.log('✅ File exists!');
        console.log('📊 Size:', stats.size, 'bytes');
      } else {
        console.log('❌ File NOT found!');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocument();
