const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:123@localhost:5432/e_office'
    }
  }
});

async function checkSignRequest43() {
  try {
    const signRequest = await prisma.sign_requests.findUnique({
      where: { id: 43 },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            document_number: true,
            file_path: true
          }
        },
        signers: {
          include: {
            user: {
              select: {
                id: true,
                full_name: true,
                email: true
              }
            }
          },
          orderBy: { signing_order: 'asc' }
        },
        fields: true
      }
    });

    if (!signRequest) {
      console.log('❌ Sign request 43 not found');
      return;
    }

    console.log('\n📋 SIGN REQUEST 43 DETAILS');
    console.log('==========================');
    console.log('ID:', signRequest.id);
    console.log('Status:', signRequest.status);
    console.log('Mode:', signRequest.mode);
    console.log('Document:', signRequest.document?.title);
    console.log('File Path:', signRequest.document?.file_path);

    console.log('\n👥 SIGNERS (' + signRequest.signers.length + ')');
    console.log('==========================');
    signRequest.signers.forEach((signer, idx) => {
      console.log(`\n${idx + 1}. Signer ID: ${signer.id}`);
      console.log(`   Type: ${signer.is_internal ? 'Internal' : 'External'}`);
      console.log(`   Order: ${signer.signing_order}`);
      console.log(`   Status: ${signer.status}`);
      console.log(`   Role: ${signer.role}`);
      if (signer.user) {
        console.log(`   User: ${signer.user.full_name} (${signer.user.email})`);
      } else {
        console.log(`   Name: ${signer.name}`);
        console.log(`   Email: ${signer.email}`);
      }
    });

    console.log('\n📝 SIGNATURE FIELDS (' + signRequest.fields.length + ')');
    console.log('==========================');
    if (signRequest.fields.length === 0) {
      console.log('⚠️  NO FIELDS FOUND - This is the problem!');
    } else {
      signRequest.fields.forEach((field, idx) => {
        console.log(`\n${idx + 1}. Field ID: ${field.id}`);
        console.log(`   Type: ${field.type}`);
        console.log(`   Page: ${field.page}`);
        console.log(`   Position: x=${field.x}, y=${field.y}`);
        console.log(`   Size: ${field.width}x${field.height}`);
        console.log(`   Assigned to signer: ${field.assigned_signer_id || 'None'}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSignRequest43();
