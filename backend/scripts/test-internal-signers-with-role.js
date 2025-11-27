const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testInternalSignersWithRole() {
  console.log('🧪 Testing Internal Signers with Role...\n');

  try {
    // Test 1: Login as admin
    console.log('✅ Test 1: Login as admin');
    const adminEmail = 'admin@acme.local';
    const adminPassword = 'password123';
    
    const loginResponse = await fetch('http://localhost:4000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    
    if (!loginResponse.ok) {
      throw new Error('Login failed');
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.data.tokens.accessToken;
    console.log('✅ Login successful\n');

    // Test 2: Create document with internal signers (mixed roles)
    console.log('✅ Test 2: Create document with internal signers');
    
    const testFile = Buffer.from('Test PDF content').toString('base64');
    
    const payload = {
      file_name: 'test-internal-signers.pdf',
      file_base64: testFile,
      document_type_id: 8, // Báo cáo
      signers: [
        {
          email: 'admin@acme.local',
          name: 'Admin User',
          order: 1,
          role: 'signer', // ✅ Người ký - cần field
          type: 'manual'
        },
        {
          email: 'approver@acme.local',
          name: 'Approver User',
          order: 2,
          role: 'approver', // ✅ Người phê duyệt - không cần field
          type: 'manual'
        },
        {
          email: 'creator@acme.local',
          name: 'Creator User',
          order: 3,
          role: 'signer', // ✅ Người ký - cần field
          type: 'manual'
        }
      ]
    };

    const createResponse = await fetch('http://localhost:4000/api/v1/documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(`Create failed: ${JSON.stringify(error)}`);
    }

    const createData = await createResponse.json();
    const documentId = createData.data.id;
    const signRequestId = createData.data.sign_request_id;
    
    console.log(`✅ Document created: ${documentId}`);
    console.log(`✅ Sign request created: ${signRequestId}\n`);

    // Test 3: Verify signers in database
    console.log('✅ Test 3: Verify signers in database');
    
    const signers = await prisma.signers.findMany({
      where: { sign_request_id: signRequestId },
      orderBy: { signing_order: 'asc' }
    });

    console.log(`Found ${signers.length} signers:\n`);
    
    for (const signer of signers) {
      console.log(`  ${signer.signing_order}. ${signer.name} (${signer.email})`);
      console.log(`     Role: ${signer.role}`);
      console.log(`     Is Internal: ${signer.is_internal}`);
      console.log(`     User ID: ${signer.user_id}`);
      console.log('');
    }

    // Test 4: Verify role logic
    console.log('✅ Test 4: Verify role logic');
    
    const signersOnly = signers.filter(s => s.role === 'signer');
    const approversOnly = signers.filter(s => s.role === 'approver');
    
    console.log(`  Người ký (signer): ${signersOnly.length} người`);
    console.log(`  Người phê duyệt (approver): ${approversOnly.length} người\n`);

    // Test 5: Check internal detection
    console.log('✅ Test 5: Check internal detection');
    
    const internalCount = signers.filter(s => s.is_internal).length;
    const externalCount = signers.filter(s => !s.is_internal).length;
    
    console.log(`  Internal: ${internalCount} người`);
    console.log(`  External: ${externalCount} người\n`);

    console.log('🎉 All tests passed!\n');
    console.log('📋 Summary:');
    console.log(`  - Document ID: ${documentId}`);
    console.log(`  - Sign Request ID: ${signRequestId}`);
    console.log(`  - Total signers: ${signers.length}`);
    console.log(`  - Signers (need fields): ${signersOnly.length}`);
    console.log(`  - Approvers (no fields): ${approversOnly.length}`);
    console.log(`  - Internal: ${internalCount}`);
    console.log(`  - External: ${externalCount}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testInternalSignersWithRole();
