const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkFieldsByRequest() {
  try {
    const signRequestId = 11; // Latest sign request
    
    console.log(`📋 Fields for sign request ${signRequestId}:`);
    
    const fields = await prisma.sign_request_fields.findMany({
      where: { sign_request_id: signRequestId },
      orderBy: [
        { page: 'asc' },
        { y: 'asc' },
        { x: 'asc' }
      ]
    });
    
    console.log(`Found ${fields.length} fields`);
    
    fields.forEach((field, index) => {
      console.log(`${index + 1}. Field ID: ${field.id}, Type: ${field.type}, Page: ${field.page}, Position: (${field.x}%, ${field.y}%), Label: ${field.label}`);
    });
    
    // Also check field values
    console.log('\n📝 Field values:');
    const fieldValues = await prisma.sign_request_field_values.findMany({
      where: {
        field: {
          sign_request_id: signRequestId
        }
      },
      include: {
        field: true
      }
    });
    
    fieldValues.forEach(fv => {
      console.log(`Field ${fv.field_id} (${fv.field.type}): ${fv.value?.substring(0, 50)}...`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFieldsByRequest();