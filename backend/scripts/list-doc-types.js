const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.document_types.findMany().then(d => {
  d.forEach(x => console.log(`${x.id}: ${x.name}`));
}).finally(() => p.$disconnect());
