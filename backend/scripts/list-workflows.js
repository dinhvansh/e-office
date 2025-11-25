const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.workflows.findMany().then(d => {
  console.log('Available Workflows:');
  d.forEach(x => console.log(`  ${x.id}: ${x.name} (${x.status})`));
}).finally(() => p.$disconnect());
