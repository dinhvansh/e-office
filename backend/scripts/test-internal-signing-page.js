const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testInternalSigningPage() {
  try {
    console.log('🧪 Testing Internal Signing Page Data...\n');

    // Find a sign request with approvals
    const signRequest = await prisma.sign_requests.findFirst({
      where: {
        status: {
          in: ['pending', 'in_progress']
        }
      },
      include: {
        signers: {
          orderBy: { signing_order: 'asc' }
        },
        document: {
          include: {
            approvals: {
              include: {
                approver: {
                  select: {
                    id: true,
                    full_name: true,
                    email: true,
                    avatar_url: true
                  }
                }
              },
              orderBy: { created_at: 'asc' }
            }
          }
        }
      }
    });

    if (!signRequest) {
      console.log('❌ No sign request found');
      return;
    }

    console.log('📋 Sign Request Info:');
    console.log('  ID:', signRequest.id);
    console.log('  Title:', signRequest.title);
    console.log('  Status:', signRequest.status);
    console.log('  Workflow Type:', signRequest.workflow_type);
    console.log('\n');

    console.log('📄 Document Info:');
    console.log('  ID:', signRequest.document.id);
    console.log('  Title:', signRequest.document.title);
    console.log('  Number:', signRequest.document.document_number);
    console.log('  File Path:', signRequest.document.file_path);
    console.log('\n');

    console.log('✅ Approvals (' + signRequest.document.approvals.length + '):');
    if (signRequest.document.approvals.length === 0) {
      console.log('  No approvals found');
    } else {
      signRequest.document.approvals.forEach((approval, index) => {
        console.log(`\n  ${index + 1}. ${approval.approver.full_name}`);
        console.log('     Email:', approval.approver.email);
        console.log('     Status:', approval.status);
        console.log('     Comments:', approval.comments || 'No comments');
        console.log('     Approved at:', approval.approved_at?.toISOString() || 'N/A');
        console.log('     Rejected at:', approval.rejected_at?.toISOString() || 'N/A');
      });
    }
    console.log('\n');

    console.log('✍️ Signers (' + signRequest.signers.length + '):');
    signRequest.signers.forEach((signer, index) => {
      console.log(`\n  ${index + 1}. ${signer.name || signer.email}`);
      console.log('     Email:', signer.email);
      console.log('     Status:', signer.status);
      console.log('     Order:', signer.signing_order);
      console.log('     Internal:', signer.is_internal ? 'Yes' : 'No');
      console.log('     Signed at:', signer.signed_at?.toISOString() || 'Not signed yet');
    });
    console.log('\n');

    // Find an internal signer who needs to sign
    const pendingSigner = signRequest.signers.find(s => 
      s.is_internal && 
      (s.status === 'pending' || s.status === 'otp_sent')
    );

    if (pendingSigner) {
      console.log('🎯 Test Internal Signing URL:');
      console.log(`   http://localhost:3000/sign-requests/${signRequest.id}/sign`);
      console.log('\n');
      console.log('📝 This page should show:');
      console.log('   ✅ PDF viewer with document');
      console.log('   ✅ Document information');
      console.log('   ✅ Approval history with comments');
      console.log('   ✅ Signature canvas');
      console.log('   ✅ Submit button');
    } else {
      console.log('⚠️ No pending internal signer found');
      console.log('   All signers have already signed or are external');
    }

    console.log('\n');
    console.log('✅ Test data ready!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testInternalSigningPage();
