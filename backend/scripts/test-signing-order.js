/**
 * Test Signing Order Control
 * Tests sequential signing workflow with order enforcement
 */

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:4000';

async function main() {
  console.log('🧪 Testing Signing Order Control\n');

  try {
    // Step 1: Login as admin
    console.log('1️⃣ Login as admin...');
    const loginRes = await axios.post(`${API_BASE}/api/v1/auth/login`, {
      email: 'admin@acme.local',
      password: 'password123',
    });
    const token = loginRes.data.data.token;
    console.log('✅ Logged in\n');

    // Step 2: Create document with sequential signing
    console.log('2️⃣ Creating document with sequential signing...');
    const formData = new FormData();
    const fs = require('fs');
    const path = require('path');
    
    // Use existing test PDF
    const pdfPath = path.join(__dirname, '../../storage/uploads/test-document.pdf');
    if (!fs.existsSync(pdfPath)) {
      console.log('⚠️ Test PDF not found, creating dummy file...');
      fs.writeFileSync(pdfPath, 'dummy pdf content');
    }

    // Create via Prisma instead of API to avoid auth issues
    const document = await prisma.documents.create({
      data: {
        tenant_id: 1,
        title: 'Test Sequential Signing Order',
        document_type_id: 1,
        file_path: pdfPath,
        original_file_name: 'test-document.pdf',
        status: 'draft',
        owner_id: 1,
      },
    });

    // Create sign request
    const signRequest = await prisma.sign_requests.create({
      data: {
        tenant_id: 1,
        document_id: document.id,
        title: 'Test Sequential Signing Order',
        workflow_type: 'sequential',
        status: 'pending',
      },
    });

    const docRes = { data: { data: { id: document.id, sign_request_id: signRequest.id } } };

    const documentId = docRes.data.data.id;
    const signRequestId = docRes.data.data.sign_request_id;
    console.log(`✅ Document created: ID=${documentId}, SignRequest=${signRequestId}\n`);

    // Update document with sign_request_id
    await prisma.documents.update({
      where: { id: documentId },
      data: { sign_request_id: signRequestId },
    });

    // Step 3: Create 3 signers with sequential order
    console.log('3️⃣ Creating 3 signers with sequential order...');
    
    const signers = [
      { email: 'signer1@test.com', name: 'Người ký 1', order: 1 },
      { email: 'signer2@test.com', name: 'Người ký 2', order: 2 },
      { email: 'signer3@test.com', name: 'Người ký 3', order: 3 },
    ];

    const createdSigners = [];
    for (const signer of signers) {
      const signerRecord = await prisma.signers.create({
        data: {
          sign_request_id: signRequestId,
          email: signer.email,
          name: signer.name,
          role: 'signer',
          status: 'pending',
          signing_order: signer.order,
          signing_token: require('crypto').randomBytes(32).toString('hex'),
        },
      });
      createdSigners.push(signerRecord);
      console.log(`  ✅ Created: ${signer.name} (Order: ${signer.order})`);
    }
    console.log('');

    // Already set to sequential in creation
    console.log('✅ Sign request already set to sequential workflow\n');

    // Step 5: Generate OTP for all signers
    console.log('4️⃣ Generating OTPs for all signers...');
    const bcrypt = require('bcryptjs');
    const otps = {};
    
    for (const signer of createdSigners) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = await bcrypt.hash(otp, 10);
      
      await prisma.signers.update({
        where: { id: signer.id },
        data: {
          otp: hashedOtp,
          otp_expire: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          status: 'otp_sent',
        },
      });
      
      otps[signer.id] = otp;
      console.log(`  ✅ ${signer.name}: OTP=${otp}`);
    }
    console.log('');

    // TEST CASE 1: Signer 3 tries to sign before Signer 1 (should fail)
    console.log('📋 TEST CASE 1: Signer 3 tries to sign out of order');
    console.log('Expected: ❌ Error - Must wait for previous signers\n');
    
    try {
      await axios.post(
        `${API_BASE}/public/sign/${createdSigners[2].signing_token}/sign`,
        {
          otp: otps[createdSigners[2].id],
          signature_data: 'data:image/png;base64,test',
          signature_type: 'drawn',
        }
      );
      console.log('❌ TEST FAILED: Should have rejected out-of-order signing\n');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ TEST PASSED: Correctly rejected');
        console.log(`   Message: ${error.response.data.message}\n`);
      } else {
        console.log('❌ TEST FAILED: Wrong error type');
        console.log(`   Error: ${error.message}\n`);
      }
    }

    // TEST CASE 2: Signer 2 tries to sign before Signer 1 (should fail)
    console.log('📋 TEST CASE 2: Signer 2 tries to sign before Signer 1');
    console.log('Expected: ❌ Error - Must wait for Signer 1\n');
    
    try {
      await axios.post(
        `${API_BASE}/public/sign/${createdSigners[1].signing_token}/sign`,
        {
          otp: otps[createdSigners[1].id],
          signature_data: 'data:image/png;base64,test',
          signature_type: 'drawn',
        }
      );
      console.log('❌ TEST FAILED: Should have rejected out-of-order signing\n');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ TEST PASSED: Correctly rejected');
        console.log(`   Message: ${error.response.data.message}\n`);
      } else {
        console.log('❌ TEST FAILED: Wrong error type');
        console.log(`   Error: ${error.message}\n`);
      }
    }

    // TEST CASE 3: Signer 1 signs (should succeed)
    console.log('📋 TEST CASE 3: Signer 1 signs (first in order)');
    console.log('Expected: ✅ Success\n');
    
    try {
      const res = await axios.post(
        `${API_BASE}/public/sign/${createdSigners[0].signing_token}/sign`,
        {
          otp: otps[createdSigners[0].id],
          signature_data: 'data:image/png;base64,test',
          signature_type: 'drawn',
        }
      );
      console.log('✅ TEST PASSED: Signer 1 signed successfully');
      console.log(`   All signed: ${res.data.data.all_signed}\n`);
    } catch (error) {
      console.log('❌ TEST FAILED: Should have succeeded');
      console.log(`   Error: ${error.response?.data?.message || error.message}\n`);
    }

    // TEST CASE 4: Signer 3 tries to sign before Signer 2 (should still fail)
    console.log('📋 TEST CASE 4: Signer 3 tries to skip Signer 2');
    console.log('Expected: ❌ Error - Must wait for Signer 2\n');
    
    try {
      await axios.post(
        `${API_BASE}/public/sign/${createdSigners[2].signing_token}/sign`,
        {
          otp: otps[createdSigners[2].id],
          signature_data: 'data:image/png;base64,test',
          signature_type: 'drawn',
        }
      );
      console.log('❌ TEST FAILED: Should have rejected out-of-order signing\n');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ TEST PASSED: Correctly rejected');
        console.log(`   Message: ${error.response.data.message}\n`);
      } else {
        console.log('❌ TEST FAILED: Wrong error type');
        console.log(`   Error: ${error.message}\n`);
      }
    }

    // TEST CASE 5: Signer 2 signs (should succeed)
    console.log('📋 TEST CASE 5: Signer 2 signs (second in order)');
    console.log('Expected: ✅ Success\n');
    
    try {
      const res = await axios.post(
        `${API_BASE}/public/sign/${createdSigners[1].signing_token}/sign`,
        {
          otp: otps[createdSigners[1].id],
          signature_data: 'data:image/png;base64,test',
          signature_type: 'drawn',
        }
      );
      console.log('✅ TEST PASSED: Signer 2 signed successfully');
      console.log(`   All signed: ${res.data.data.all_signed}\n`);
    } catch (error) {
      console.log('❌ TEST FAILED: Should have succeeded');
      console.log(`   Error: ${error.response?.data?.message || error.message}\n`);
    }

    // TEST CASE 6: Signer 3 signs (should succeed and complete)
    console.log('📋 TEST CASE 6: Signer 3 signs (last in order)');
    console.log('Expected: ✅ Success + All signed = true\n');
    
    try {
      const res = await axios.post(
        `${API_BASE}/public/sign/${createdSigners[2].signing_token}/sign`,
        {
          otp: otps[createdSigners[2].id],
          signature_data: 'data:image/png;base64,test',
          signature_type: 'drawn',
        }
      );
      console.log('✅ TEST PASSED: Signer 3 signed successfully');
      console.log(`   All signed: ${res.data.data.all_signed}`);
      
      if (res.data.data.all_signed) {
        console.log('✅ All signers completed!\n');
      } else {
        console.log('⚠️ Warning: all_signed should be true\n');
      }
    } catch (error) {
      console.log('❌ TEST FAILED: Should have succeeded');
      console.log(`   Error: ${error.response?.data?.message || error.message}\n`);
    }

    // Verify final status
    console.log('5️⃣ Verifying final status...');
    const finalSignRequest = await prisma.sign_requests.findUnique({
      where: { id: signRequestId },
      include: { signers: { orderBy: { signing_order: 'asc' } } },
    });

    console.log('\nFinal Status:');
    console.log(`  Sign Request: ${finalSignRequest.status}`);
    finalSignRequest.signers.forEach((s) => {
      console.log(`  ${s.name}: ${s.status} (Order: ${s.signing_order})`);
    });

    console.log('\n✅ All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
