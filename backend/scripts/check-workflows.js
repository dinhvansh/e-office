const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();

p.workflows.findMany({select:{id:true,name:true}})
  .then(r => {
    console.log('📋 Workflows:', r);
    p.$disconnect();
  });
