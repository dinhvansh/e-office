const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkFields() {
  try {
    const fields = await prisma.sign_request_fields.findMany({
      where: { sign_request_id: 1 },
      select: {
        id: true,
        type: true,
        assigned_signer_id: true,
        required: true,
        label: true,
      }
    });

    console.log(`📋 Fields for sign request 1: ${fields.length} fields`);
    fields.forEach(f => {
      console.log(`Field ID: ${f.id}, Type: ${f.type}, Signer: ${f.assigned_signer_id}, Required: ${f.required}, Label: ${f.label || 'No label'}`);
    });

    if (fields.length === 0) {
      console.log('⚠️  No fields found! Need to add fields first.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFields();