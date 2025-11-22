const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDocumentTypes() {
  const types = await prisma.document_types.findMany({
    select: {
      id: true,
      name: true,
      require_digital_signing: true,
      require_approval: true,
      is_active: true,
    },
    orderBy: { id: 'asc' }
  });

  console.log('\n📋 Document Types Configuration:\n');
  console.log('ID | Name | Digital Signing | Approval | Active');
  console.log('---|------|-----------------|----------|-------');
  
  types.forEach(t => {
    const signing = t.require_digital_signing ? '✅' : '❌';
    const approval = t.require_approval ? '✅' : '❌';
    const active = t.is_active ? '✅' : '❌';
    console.log(`${t.id.toString().padEnd(3)}| ${t.name.padEnd(30)} | ${signing.padEnd(15)} | ${approval.padEnd(8)} | ${active}`);
  });

  console.log('\n💡 Tip: Chọn loại văn bản có "Digital Signing = ✅" để thấy Add Recipients dialog\n');

  await prisma.$disconnect();
}

checkDocumentTypes();
