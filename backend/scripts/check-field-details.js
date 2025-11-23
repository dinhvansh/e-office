const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFieldDetails() {
  const signRequestId = parseInt(process.argv[2]) || 40;
  
  const fields = await prisma.sign_request_fields.findMany({
    where: { sign_request_id: signRequestId },
    orderBy: [
      { page: 'asc' },
      { y: 'asc' },
      { x: 'asc' },
    ],
    include: {
      assigned_signer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  console.log(`\n📋 Fields for Sign Request #${signRequestId}:\n`);
  console.log('═'.repeat(80));
  
  fields.forEach((field, index) => {
    console.log(`\n${index + 1}. Field #${field.id}`);
    console.log(`   Type: ${field.type}`);
    console.log(`   Label: ${field.label || '(no label)'}`);
    console.log(`   Page: ${field.page}`);
    console.log(`   Position: (${field.x}%, ${field.y}%)`);
    console.log(`   Size: ${field.width}% x ${field.height}%`);
    console.log(`   Signer: ${field.assigned_signer?.name || '(any)'} (ID: ${field.assigned_signer_id || 'null'})`);
    console.log(`   Required: ${field.is_required ? 'Yes' : 'No'}`);
  });
  
  console.log('\n' + '═'.repeat(80));
  console.log(`\n✅ Total: ${fields.length} fields\n`);
  
  // Group by type
  const byType = fields.reduce((acc, f) => {
    acc[f.type] = (acc[f.type] || 0) + 1;
    return acc;
  }, {});
  
  console.log('📊 By Type:');
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });
  
  // Group by signer
  const bySigner = fields.reduce((acc, f) => {
    const key = f.assigned_signer?.name || 'Any signer';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  
  console.log('\n📊 By Signer:');
  Object.entries(bySigner).forEach(([signer, count]) => {
    console.log(`   ${signer}: ${count}`);
  });
  
  console.log('');
  
  await prisma.$disconnect();
}

checkFieldDetails().catch(console.error);
