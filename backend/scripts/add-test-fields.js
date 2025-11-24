const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addTestFields() {
  try {
    const signRequestId = 1;
    const signerId = 1;
    const documentId = 2; // From the sign request data we saw earlier

    // Add a signature field
    const signatureField = await prisma.sign_request_fields.create({
      data: {
        sign_request: { connect: { id: signRequestId } },
        document: { connect: { id: documentId } },
        assigned_signer: { connect: { id: signerId } },
        type: 'signature',
        page: 1,
        x: 50, // 50% from left
        y: 70, // 70% from top
        width: 200,
        height: 60,
        required: true,
        label: 'Chữ ký',
        placeholder: 'Vui lòng ký tại đây',
      }
    });

    // Add a date field
    const dateField = await prisma.sign_request_fields.create({
      data: {
        sign_request: { connect: { id: signRequestId } },
        document: { connect: { id: documentId } },
        assigned_signer: { connect: { id: signerId } },
        type: 'date',
        page: 1,
        x: 50, // 50% from left
        y: 80, // 80% from top
        width: 150,
        height: 30,
        required: true,
        label: 'Ngày ký',
        placeholder: 'DD/MM/YYYY',
      }
    });

    console.log('✅ Added test fields:');
    console.log(`Signature field ID: ${signatureField.id}`);
    console.log(`Date field ID: ${dateField.id}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestFields();