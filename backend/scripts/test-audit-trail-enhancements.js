/**
 * Test Audit Trail Enhancements
 * 
 * Tests:
 * 1. Auto-generate PDF after internal signing
 * 2. Approval history in audit trail
 * 3. IP address and platform info
 * 4. Token display for external signers
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing Audit Trail Enhancements\n');

  try {
    // Find a completed sign request with both approvals and signatures
    const signRequest = await prisma.sign_requests.findFirst({
      where: {
        status: 'completed'
      },
      include: {
        document: {
          include: {
            approvals: {
              include: {
                approver: true,
                workflow_step: true
              },
              orderBy: { created_at: 'asc' }
            }
          }
        },
        signers: {
          orderBy: { signing_order: 'asc' }
        }
      },
      orderBy: { id: 'desc' }
    });

    if (!signRequest) {
      console.log('❌ No completed sign requests found');
      console.log('💡 Create a sign request and complete it first');
      return;
    }

    console.log('✅ Found completed sign request:');
    console.log(`   ID: ${signRequest.id}`);
    console.log(`   Document: ${signRequest.document.title}`);
    console.log(`   Status: ${signRequest.status}`);
    console.log(`   Signed PDF: ${signRequest.document.signed_file_path || 'Not generated'}`);
    console.log();

    // Check approvals
    console.log('📋 Approval History:');
    if (signRequest.document.approvals.length === 0) {
      console.log('   No approvals found');
    } else {
      for (const approval of signRequest.document.approvals) {
        console.log(`   ✓ ${approval.approver.full_name} - ${approval.workflow_step.step_name}`);
        console.log(`     Status: ${approval.action}`);
        console.log(`     Date: ${approval.acted_at ? new Date(approval.acted_at).toLocaleString('vi-VN') : 'Pending'}`);
        if (approval.comment) {
          console.log(`     Comment: ${approval.comment}`);
        }
      }
    }
    console.log();

    // Check signers
    console.log('✍️ Signing History:');
    for (const signer of signRequest.signers) {
      console.log(`   ${signer.signing_order}. ${signer.name} (${signer.type})`);
      console.log(`      Email: ${signer.email}`);
      console.log(`      Status: ${signer.status}`);
      console.log(`      Signed: ${signer.signed_at ? new Date(signer.signed_at).toLocaleString('vi-VN') : 'Not signed'}`);
      
      // Check IP address
      if (signer.ip_address) {
        console.log(`      IP: ${signer.ip_address}`);
      } else {
        console.log(`      IP: ⚠️ Not recorded`);
      }

      // Check token for external signers
      if (signer.type === 'external' && signer.signing_token) {
        const tokenHash = signer.signing_token.substring(0, 16) + '...';
        console.log(`      Token: ${tokenHash}`);
      } else if (signer.type === 'internal') {
        console.log(`      Auth: Internal User`);
      }
    }
    console.log();

    // Check if signed PDF exists
    if (signRequest.document.signed_file_path) {
      console.log('✅ Signed PDF generated');
      console.log(`   Path: ${signRequest.document.signed_file_path}`);
      
      const fs = require('fs');
      const path = require('path');
      const fullPath = path.resolve(__dirname, '../../', signRequest.document.signed_file_path);
      
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`   Created: ${stats.birthtime.toLocaleString('vi-VN')}`);
      } else {
        console.log('   ⚠️ File not found on disk');
      }
    } else {
      console.log('⚠️ Signed PDF not generated yet');
      console.log('💡 This should auto-generate when all signers complete');
    }
    console.log();

    // Summary
    console.log('📊 Summary:');
    console.log(`   ✓ Approvals: ${signRequest.document.approvals.length}`);
    console.log(`   ✓ Signers: ${signRequest.signers.length}`);
    console.log(`   ✓ Signed: ${signRequest.signers.filter(s => s.status === 'signed' || s.status === 'completed').length}`);
    console.log(`   ✓ IP Recorded: ${signRequest.signers.filter(s => s.ip_address).length}/${signRequest.signers.length}`);
    console.log(`   ✓ PDF Generated: ${signRequest.document.signed_file_path ? 'Yes' : 'No'}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
