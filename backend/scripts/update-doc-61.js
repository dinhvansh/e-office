const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.documents.update({where:{id:61},data:{sign_request_id:15}})
  .then(()=>console.log('✅ Updated document 61 with sign_request_id: 15'))
  .finally(()=>p.$disconnect());
