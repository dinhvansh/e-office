const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDocument() {
  try {
    console.log('🔍 Checking Document 022/2025...\n');

    // Find document by number
    const document = await prisma.documents.findFirst({
      where: {
        document_number: '022/2025'
      },
      include: {
        owner: {
          select: {
            id: true,
            full_name: true,
            email: true
          }
        },
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
        },
        sign_requests: {
          include: {
            signers: {
              orderBy: { signing_order: 'asc' }
            }
          }
        }
      }
    });

    if (!document) {
      console.log('❌ Document 022/2025 not found');
      return;
    }

    console.log('📄 Document Info:');
    console.log('  ID:', document.id);
    console.log('  Title:', document.title || 'N/A');
    console.log('  Number:', document.document_number);
    console.log('  File:', document.original_file_name);
    console.log('  Status:', document.status);
    console.log('  Owner:', document.owner.full_name);
    console.log('  File Path:', document.file_path);
    console.log('\n');

    console.log('✅ Approvals (' + document.approvals.length + '):');
    if (document.approvals.length === 0) {
      console.log('  No approvals found');
    } else {
      document.approvals.forEach((approval, index) => {
        console.log(`\n  ${index + 1}. ${approval.approver.full_name}`);
        console.log('     Email:', approval.approver.email);
        console.log('     Status:', approval.status);
        console.log('     Comments:', approval.comments || 'No comments');
        if (approval.approved_at) {
          console.log('     Approved at:', approval.approved_at.toISOString());
        }
        if (approval.rejected_at) {
          console.log('     Rejected at:', approval.rejected_at.toISOString());
        }
      });
    }
    console.log('\n');

    console.log('📋 Sign Requests (' + document.sign_requests.length + '):');
    if (document.sign_requests.length === 0) {
      console.log('  No sign requests found');
    } else {
      document.sign_requests.forEach((sr, index) => {
        console.log(`\n  ${index + 1}. Sign Request #${sr.id}`);
        console.log('     Title:', sr.title);
        console.log('     Status:', sr.status);
        console.log('     Workflow:', sr.workflow_type);
        console.log('     Signers:', sr.signers.length);
        
        sr.signers.forEach((signer, idx) => {
          console.log(`\n     Signer ${idx + 1}:`);
          console.log('       Name:', signer.name || signer.email);
          console.log('       Email:', signer.email);
          console.log('       Status:', signer.status);
          console.log('       Order:', signer.signing_order);
          console.log('       Internal:', signer.is_internal ? 'Yes' : 'No');
          if (signer.signed_at) {
            console.log('       Signed at:', signer.signed_at.toISOString());
          }
        });
      });
    }
    console.log('\n');

    // Find sign request with pending internal signer
    const signRequest = document.sign_requests.find(sr => 
      sr.signers.some(s => s.is_internal && (s.status === 'pending' || s.status === 'otp_sent'))
    );

    if (signRequest) {
      console.log('🎯 Test Internal Signing URL:');
      console.log(`   http://localhost:3000/sign-requests/${signRequest.id}/sign`);
      console.log('\n');
      console.log('📝 This page should show:');
      console.log('   ✅ PDF viewer with document');
      console.log('   ✅ Document information');
      console.log(`   ✅ Approval history (${document.approvals.length} approvals${document.approvals.some(a => a.comments) ? ' with comments' : ''})`);
      console.log('   ✅ Signature canvas');
      console.log('   ✅ Submit button');
    } else {
      console.log('⚠️ No pending internal signer found');
      console.log('   All signers have already signed or are external');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocument();
