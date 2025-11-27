/**
 * Test: Validation - Chỉ signers có fields, approvers không có
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRoleFieldValidation() {
  console.log('🧪 TEST: Role-based field validation\n');

  try {
    // Find sign request with signers
    const signRequest = await prisma.sign_requests.findFirst({
      where: {
        status: 'draft',
        signers: {
          some: {}
        }
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
      console.log('❌ No sign request found with signers');
      return;
    }

    console.log(`✅ Sign Request: ${signRequest.id}`);
    console.log(`   Document: ${signRequest.document?.document_number || 'N/A'}`);
    console.log(`   Signers: ${signRequest.signers.length}`);
    console.log(`   Fields: ${signRequest.fields.length}\n`);

    // Analyze by role
    const byRole = {
      signer: signRequest.signers.filter(s => s.role === 'signer' || !s.role),
      approver: signRequest.signers.filter(s => s.role === 'approver')
    };

    console.log('📊 Signers by role:');
    console.log(`   Signers (role='signer'): ${byRole.signer.length}`);
    byRole.signer.forEach(s => {
      const fieldCount = signRequest.fields.filter(f => f.signer_id === s.id).length;
      console.log(`     - ${s.name} (${s.email}) - ${fieldCount} fields`);
    });

    console.log(`   Approvers (role='approver'): ${byRole.approver.length}`);
    byRole.approver.forEach(s => {
      const fieldCount = signRequest.fields.filter(f => f.signer_id === s.id).length;
      console.log(`     - ${s.name} (${s.email}) - ${fieldCount} fields ${fieldCount > 0 ? '⚠️ SHOULD BE 0' : '✅'}`);
    });

    // Validation
    console.log('\n✅ Validation:');
    let passed = true;

    // Check: No approvers have fields
    const approversWithFields = byRole.approver.filter(a => 
      signRequest.fields.some(f => f.signer_id === a.id)
    );

    if (approversWithFields.length > 0) {
      console.log(`❌ FAILED: ${approversWithFields.length} approvers có fields (không đúng)`);
      passed = false;
    } else {
      console.log('✅ PASSED: Approvers không có fields');
    }

    // Check: All fields belong to signers
    const fieldsToNonSigners = signRequest.fields.filter(f => {
      const signer = signRequest.signers.find(s => s.id === f.signer_id);
      return signer && signer.role === 'approver';
    });

    if (fieldsToNonSigners.length > 0) {
      console.log(`❌ FAILED: ${fieldsToNonSigners.length} fields assigned to approvers`);
      passed = false;
    } else {
      console.log('✅ PASSED: Tất cả fields đều assign cho signers');
    }

    console.log('\n' + '='.repeat(60));
    if (passed) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('✅ Logic đúng: Chỉ signers có fields, approvers không có');
    } else {
      console.log('❌ TESTS FAILED!');
      console.log('⚠️ Cần fix: Approvers không nên có fields');
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testRoleFieldValidation();
