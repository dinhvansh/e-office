const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();

p.documents.findUnique({
  where: {id: 61},
  include: {sign_requests: true}
}).then(d => {
  console.log('Document 61:');
  console.log(`  ID: ${d.id}`);
  console.log(`  Title: ${d.title}`);
  console.log(`  Sign Request ID: ${d.sign_request_id}`);
  console.log(`  Sign Request:`, d.sign_requests);
}).finally(() => p.$disconnect());
