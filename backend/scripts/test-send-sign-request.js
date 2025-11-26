const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSendSignRequest() {
  try {
    console.log('🔍 Testing Send Sign Request...\n');

    // Find a draft sign request
    const signRequest = await prisma.sign_requests.findFirst({
      where: {
        status: 'draft'
      },
      include: {
        signers: true,
        document: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    if (!signRequest) {
      console.log('❌ No draft sign request found');
      console.log('Creating a test sign request...\n');
      
      // Create test document and sign request
      const document = await prisma.documents.create({
        data: {
          tenant_id: 1,
          title: 'Test Document for Send',
          file_path: 'storage/1/test.pdf',
          file_size: 1024,
          mime_type: 'application/pdf',
          status: 'active',
          owner_id: 1,
          require_digital_signing: true
        }
      });

      const newSignRequest = await prisma.sign_requests.create({
        data: {
          tenant_id: 1,
          document_id: document.id,
          status: 'draft',
          workflow_type: 'sequential',
          signers: {
            create: [
              {
                tenant_id: 1,
                email: 'admin@acme.local',
                name: 'Admin User',
                signing_order: 1,
                status: 'pending',
                is_internal: true,
                user: { connect: { id: 1 } }
              }
            ]
          }
        },
        include: {
          signers: true,
          document: true
        }
      });

      console.log('✅ Created test sign request:', newSignRequest.id);
      return testSendSignRequest(); // Retry with new sign request
    }

    console.log('📋 Sign Request Details:');
    console.log('  ID:', signRequest.id);
    console.log('  Document:', signRequest.document.title);
    console.log('  Status:', signRequest.status);
    console.log('  Signers:', signRequest.signers.length);
    console.log('');

    // Check signers
    console.log('👥 Signers:');
    signRequest.signers.forEach((signer, index) => {
      console.log(`  ${index + 1}. ${signer.name} (${signer.email})`);
      console.log(`     Order: ${signer.signing_order}`);
      console.log(`     Internal: ${signer.is_internal}`);
      console.log(`     Status: ${signer.status}`);
      console.log(`     Has token: ${!!signer.signing_token}`);
    });
    console.log('');

    // Simulate send operation
    console.log('🚀 Simulating send operation...\n');

    // Generate tokens for signers
    const crypto = require('crypto');
    for (const signer of signRequest.signers) {
      if (!signer.signing_token) {
        const token = crypto.randomBytes(32).toString('hex');
        await prisma.signers.update({
          where: { id: signer.id },
          data: { signing_token: token }
        });
        console.log(`✅ Generated token for ${signer.email}`);
      }
    }

    // Update sign request status
    await prisma.sign_requests.update({
      where: { id: signRequest.id },
      data: { 
        status: 'pending',
        sent_at: new Date()
      }
    });

    // Update document status
    await prisma.documents.update({
      where: { id: signRequest.document_id },
      data: { status: 'pending_signature' }
    });

    console.log('✅ Sign request sent successfully!');
    console.log('');

    // Verify
    const updated = await prisma.sign_requests.findUnique({
      where: { id: signRequest.id },
      include: {
        signers: true,
        document: true
      }
    });

    console.log('📊 Updated Status:');
    console.log('  Sign Request:', updated.status);
    console.log('  Document:', updated.document.status);
    console.log('  Sent at:', updated.sent_at);
    console.log('');

    console.log('✅ All checks passed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testSendSignRequest();
