/**
 * Test: Approvers không cần signature fields
 * Verify: Chỉ signers (role='signer') mới có fields assigned
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testApproverNoFields() {
  console.log('🧪 TEST: Approvers không cần signature fields\n');

  try {
    // Step 1: Find a sign request with mixed roles
    console.log('📋 Step 1: Tìm sign request có cả signer và approver...');
    const signRequest = await prisma.sign_requests.findFirst({
      where: {
        status: 'draft',
      },
      include: {
        signers: {
          orderBy: { signing_order: 'asc' }
        },
        fields: true,
        document: {
          select: {
            id: true,
            title: true,
            document_number: true,
          }
        }
      }
    });

    if (!signRequest) {
      console.log('❌ Không tìm thấy sign request draft');
      return;
    }

    console.log(`✅ Found Sign Request: ${signRequest.id}`);
    console.log(`   Document: ${signRequest.document.document_number} - ${signRequest.document.title}`);
    console.log(`   Total signers: ${signRequest.signers.length}`);
    console.log(`   Total fields: ${signRequest.fields.length}\n`);

    // Step 2: Analyze signers by role
    console.log('📊 Step 2: Phân tích signers theo role...');
    const signersByRole = {
      signer: signRequest.signers.filter(s => s.role === 'signer' || !s.role),
      approver: signRequest.signers.filter(s => s.role === 'approver')
    };

    console.log(`   Signers (role='signer'): ${signersByRole.signer.length}`);
    signersByRole.signer.forEach(s => {
      console.log(`     - ${s.name} (${s.email}) - Order: ${s.signing_order}`);
    });

    console.log(`   Approvers (role='approver'): ${signersByRole.approver.length}`);
    signersByRole.approver.forEach(s => {
      console.log(`     - ${s.name} (${s.email}) - Order: ${s.signing_order}`);
    });
    console.log('');

    // Step 3: Check fields assignment
    console.log('🔍 Step 3: Kiểm tra fields assignment...');
    const fieldsGrouped = {
      signer: [],
      approver: [],
      unassigned: []
    };

    for (const field of signRequest.fields) {
      const signer = signRequest.signers.find(s => s.id === field.signer_id);
      if (!signer) {
        fieldsGrouped.unassigned.push(field);
      } else if (signer.role === 'approver') {
        fieldsGrouped.approver.push(field);
      } else {
        fieldsGrouped.signer.push(field);
      }
    }

    console.log(`   Fields assigned to signers: ${fieldsGrouped.signer.length}`);
    fieldsGrouped.signer.forEach(f => {
      const signer = signRequest.signers.find(s => s.id === f.signer_id);
      console.log(`     - Field ${f.id} (${f.field_type}) → ${signer.name}`);
    });

    console.log(`   Fields assigned to approvers: ${fieldsGrouped.approver.length}`);
    if (fieldsGrouped.approver.length > 0) {
      console.log('     ⚠️ WARNING: Approvers có fields assigned!');
      fieldsGrouped.approver.forEach(f => {
        const signer = signRequest.signers.find(s => s.id === f.signer_id);
        console.log(`     - Field ${f.id} (${f.field_type}) → ${signer.name} (SHOULD NOT HAVE FIELD)`);
      });
    } else {
      console.log('     ✅ Correct: No fields assigned to approvers');
    }

    console.log(`   Unassigned fields: ${fieldsGrouped.unassigned.length}\n`);

    // Step 4: Validation
    console.log('✅ Step 4: Validation Results...');
    let allTestsPassed = true;

    // Test 1: Approvers should NOT have fields
    if (fieldsGrouped.approver.length > 0) {
      console.log('❌ TEST FAILED: Approvers có fields assigned (không đúng)');
      allTestsPassed = false;
    } else {
      console.log('✅ TEST PASSED: Approvers không có fields (đúng)');
    }

    // Test 2: Signers should have fields (if any fields exist)
    if (signRequest.fields.length > 0 && fieldsGrouped.signer.length === 0) {
      console.log('❌ TEST FAILED: Có fields nhưng không có signer nào được assign');
      allTestsPassed = false;
    } else if (fieldsGrouped.signer.length > 0) {
      console.log('✅ TEST PASSED: Signers có fields assigned (đúng)');
    }

    // Test 3: All fields should be assigned to signers only
    const allFieldsToSigners = signRequest.fields.every(f => {
      const signer = signRequest.signers.find(s => s.id === f.signer_id);
      return signer && (signer.role === 'signer' || !signer.role);
    });

    if (!allFieldsToSigners && signRequest.fields.length > 0) {
      console.log('❌ TEST FAILED: Có fields không được assign cho signer');
      allTestsPassed = false;
    } else if (signRequest.fields.length > 0) {
      console.log('✅ TEST PASSED: Tất cả fields đều assign cho signers');
    }

    console.log('\n' + '='.repeat(60));
    if (allTestsPassed) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('✅ Logic đúng: Chỉ signers có fields, approvers không có fields');
    } else {
      console.log('❌ SOME TESTS FAILED!');
      console.log('⚠️ Cần fix: Approvers không nên có fields assigned');
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run test
testApproverNoFields();
