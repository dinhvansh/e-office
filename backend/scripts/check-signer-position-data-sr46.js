const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Checking signer position_data for SR #46...\n');

    const signers = await prisma.signers.findMany({
      where: {
        sign_request_id: 46
      },
      include: {
        user: true
      }
    });

    console.log(`Found ${signers.length} signer(s)\n`);

    for (const signer of signers) {
      const name = signer.user?.full_name || signer.name || signer.email;
      console.log('='.repeat(80));
      console.log(`Signer: ${name}`);
      console.log('='.repeat(80));
      console.log('ID:', signer.id);
      console.log('Status:', signer.status);
      console.log('Signed at:', signer.signed_at);
      console.log('');

      if (signer.position_data) {
        console.log('✅ HAS position_data');
        try {
          const posData = typeof signer.position_data === 'string' 
            ? JSON.parse(signer.position_data) 
            : signer.position_data;
          
          console.log('Position data keys:', Object.keys(posData));
          console.log('');
          
          Object.entries(posData).forEach(([fieldId, value]) => {
            console.log(`Field ${fieldId}:`);
            if (typeof value === 'string') {
              console.log(`  Type: ${value.startsWith('data:image') ? 'Image (base64)' : 'Text'}`);
              console.log(`  Length: ${value.length} chars`);
              if (value.startsWith('data:image')) {
                console.log(`  Preview: ${value.substring(0, 50)}...`);
              } else {
                console.log(`  Value: ${value}`);
              }
            } else {
              console.log(`  Value:`, value);
            }
            console.log('');
          });
        } catch (e) {
          console.log('❌ Error parsing position_data:', e.message);
          console.log('Raw data:', JSON.stringify(signer.position_data).substring(0, 200));
        }
      } else {
        console.log('❌ NO position_data');
      }
      console.log('');
    }

    // Check field values table
    console.log('\n' + '='.repeat(80));
    console.log('Checking sign_request_field_values table...');
    console.log('='.repeat(80));

    const fieldValues = await prisma.sign_request_field_values.findMany({
      where: {
        sign_request_id: 46
      },
      include: {
        field: true,
        signer: true
      }
    });

    console.log(`Found ${fieldValues.length} field value(s)\n`);

    fieldValues.forEach((fv, idx) => {
      console.log(`${idx + 1}. Field ${fv.field_id} (${fv.field.type}):`);
      console.log(`   Signer: ${fv.signer.name || fv.signer.email}`);
      if (typeof fv.value === 'string') {
        console.log(`   Value type: ${fv.value.startsWith('data:image') ? 'Image' : 'Text'}`);
        console.log(`   Length: ${fv.value.length}`);
      } else {
        console.log(`   Value:`, fv.value);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
