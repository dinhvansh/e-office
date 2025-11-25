const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const types = await prisma.document_types.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      require_digital_signing: true
    }
  });
  
  console.log('📋 Document Types:');
  types.forEach(t => {
    console.log(`  ${t.id}. ${t.name} (${t.code}) - Signing: ${t.require_digital_signing ? '✅' : '❌'}`);
  });
  
  await prisma.$disconnect();
}

check();
