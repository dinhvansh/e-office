/**
 * Create test data: Sign request với mixed roles (signer + approver)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createMixedRoleTest() {
  console.log('🔧 Creating test data: Mixed roles (signer + approver)\n');

  try {
    // Step 1: Login as admin
    console.log('📋 Step 1: Get admin user...');
    const admin = await prisma.users.findFirst({
      where: { email: 'admin@acme.local' }
    });

    if (!admin) {
      console.log('❌ Admin user not found');
      return;
    }
    console.log(`✅ Admin: ${admin.email} (ID: ${admin.id})\n`);

    // Step 2: Find document type
    console.log('📋 Step 2: Get document type...');
    const docType = await prisma.document_types.findFirst({
      where: {
        tenant_id: admin.tenant_id,
        require_digital_signing: true,
        is_active: true
      }
    });

    if (!docType) {
      console.log('❌ No document type found');
      return;
    }
    console.log(`✅ Document Type: ${docType.name} (ID: ${docType.id})\n`);

    // Step 3: Create document
    console.log('📋 Step 3: Creating document...');
    const document = await prisma.documents.create({
      data: {
        tenant_id: admin.tenant_id,
        title: 'Test Mixed Roles Document',
        document_number: 'TEST-MIXED-' + Date.now(),
        document_type_id: docType.id,
        file_path: 'test/mixed-roles.pdf',
        original_file_name: 'mixed-roles.pdf',
        status: 'active',
        owner_id: admin.id,
        visibility_scope: 'public',
        confidential_level: 'normal',
      }
    });
    console.log(`✅ Document created: ${document.id} - ${document.document_number}\n`);

    // Step 4: Create sign request
    console.log('📋 Step 4: Creating sign request...');
    const signRequest = await prisma.sign_requests.create({
      data: {
        document_id: document.id,
        tenant_id: admin.tenant_id,
        status: 'draft',
        workflow_type: 'sequential',
      }
    });
    console.log(`✅ Sign Request created: ${signRequest.id}\n`);

    // Step 5: Add signers with mixed roles
    console.log('📋 Step 5: Adding signers with mixed roles...');
    
    // Approver 1 (role='approver') - Order 1
    const approver1 = await prisma.signers.create({
      data: {
        sign_request_id: signRequest.id,
        tenant_id: admin.tenant_id,
        email: 'approver@acme.local',
        name: 'Người phê duyệt 1',
        role: 'approver',
        signing_order: 1,
        status: 'pending',
        is_internal: true,
        user_id: admin.id, // Use admin for testing
      }
    });
    console.log(`✅ Approver 1: ${approver1.name} (role='approver', order=1)`);

    // Signer 1 (role='signer') - Order 2
    const signer1 = await prisma.signers.create({
      data: {
        sign_request_id: signRequest.id,
        tenant_id: admin.tenant_id,
        email: 'signer1@example.com',
        name: 'Người ký 1',
        role: 'signer',
        signing_order: 2,
        status: 'pending',
        is_internal: false,
      }
    });
    console.log(`✅ Signer 1: ${signer1.name} (role='signer', order=2)`);

    // Approver 2 (role='approver') - Order 3
    const approver2 = await prisma.signers.create({
      data: {
        sign_request_id: signRequest.id,
        tenant_id: admin.tenant_id,
        email: 'approver2@acme.local',
        name: 'Người phê duyệt 2',
        role: 'approver',
        signing_order: 3,
        status: 'pending',
        is_internal: true,
        user_id: admin.id,
      }
    });
    console.log(`✅ Approver 2: ${approver2.name} (role='approver', order=3)`);

    // Signer 2 (role='signer') - Order 4
    const signer2 = await prisma.signers.create({
      data: {
        sign_request_id: signRequest.id,
        tenant_id: admin.tenant_id,
        email: 'signer2@example.com',
        name: 'Người ký 2',
        role: 'signer',
        signing_order: 4,
        status: 'pending',
        is_internal: false,
      }
    });
    console.log(`✅ Signer 2: ${signer2.name} (role='signer', order=4)\n`);

    // Step 6: Add fields ONLY for signers (not approvers)
    console.log('📋 Step 6: Adding signature fields (only for signers)...');
    
    // Field for Signer 1
    const field1 = await prisma.sign_request_fields.create({
      data: {
        sign_request_id: signRequest.id,
        signer_id: signer1.id,
        field_type: 'signature',
        page_number: 1,
        x: 20,
        y: 70,
        width: 30,
        height: 10,
        is_required: true,
      }
    });
    console.log(`✅ Field 1: signature → ${signer1.name} (signer)`);

    // Field for Signer 2
    const field2 = await prisma.sign_request_fields.create({
      data: {
        sign_request_id: signRequest.id,
        signer_id: signer2.id,
        field_type: 'signature',
        page_number: 1,
        x: 60,
        y: 70,
        width: 30,
        height: 10,
        is_required: true,
      }
    });
    console.log(`✅ Field 2: signature → ${signer2.name} (signer)`);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 TEST DATA CREATED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`Sign Request ID: ${signRequest.id}`);
    console.log(`Document ID: ${document.id}`);
    console.log(`\nSigners:`);
    console.log(`  1. ${approver1.name} (role='approver') - NO FIELD ✅`);
    console.log(`  2. ${signer1.name} (role='signer') - HAS FIELD ✅`);
    console.log(`  3. ${approver2.name} (role='approver') - NO FIELD ✅`);
    console.log(`  4. ${signer2.name} (role='signer') - HAS FIELD ✅`);
    console.log(`\nTotal Fields: 2 (only for signers)`);
    console.log('='.repeat(60));
    console.log('\n✅ Ready to test with: node scripts/test-approver-no-fields.js');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run
createMixedRoleTest();
