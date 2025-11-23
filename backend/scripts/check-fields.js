const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFields() {
  const fields = await prisma.sign_request_fields.findMany({
    where: { sign_request_id: 43 },
    orderBy: { id: 'asc' },
  });
  
  console.log('\n📋 Fields for Sign Request 43:\n');
  fields.forEach((f, i) => {
    console.log(`${i + 1}. Field ID: ${f.id}`);
    console.log(`   Type: ${f.type}`);
    console.log(`   Label: ${f.label}`);
    console.log(`   Assigned Signer: ${f.assigned_signer_id || 'None (all signers)'}`);
    console.log(`   Page: ${f.page}, Position: (${f.x}%, ${f.y}%)`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

checkFields();
