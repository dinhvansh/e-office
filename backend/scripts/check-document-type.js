const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dt = await prisma.document_types.findFirst({
    where: { name: 'Hợp đồng' }
  });
  
  console.log('Document Type:', dt?.name);
  console.log('Requires Approval:', dt?.require_approval);
  console.log('Requires Signing:', dt?.require_digital_signing);
  console.log('Default Workflow ID:', dt?.default_workflow_id);
  console.log('Allow Workflow Override:', dt?.allow_workflow_override);
}

main().finally(() => prisma.$disconnect());
