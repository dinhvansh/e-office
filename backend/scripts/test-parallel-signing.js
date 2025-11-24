/**
 * Test Parallel Signing
 * Tests parallel signing workflow where order doesn't matter
 */

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:4000';

async function main() {
  console.log('🧪 Testing Parallel Signing\n');

  try {
    // Step 1: Login as admin
    console.log('1️⃣ Login as admin...');
    const loginRes = await axios.post(`${API_BASE}/api/v1/auth/login`, {
      email: 'admin@acme.local',
      password: 'password123',
    });
    const token = loginRes.data.data.token;
    console.log('✅ Logged in\n');

    // Step 2: Create document with parallel signing
    console.log('2️⃣ Creating document with parallel signing...');
    const fs = require('fs');
    const path = require('path');
    
    const pdfPath = path.join(__dirname, '../../storage/uploads/test-document.pdf');
    if (!fs.existsSync(pdfPath)) {
      fs.writeFileSync(pdfPath, 'dummy pdf content');
    }

    const docRes = await axios.post(
      `${API_BASE}/api/v1/documents`,
      {
        title: 'Test Parallel Signing',
        document_type_id: 1,
        require_digital_signing: true,
        file_path: pdfPath,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const documentId = docRes.data.data.id;
    const signRequestId = docRes.data.data.sign_request_id;
    console.log(`✅ Document created: ID=${documentId}, SignRequest=${signRequestId}\n`);

    // Step 3: Create 3 signers (order doesn't matter in parallel)
    console.log('3️⃣ Creating 3 signers for parallel signing...');
    
    const signers = [
      { email: 'parallel1@test.com', name: 'Người ký A', order: 1 },
      { email: 'parallel2@test.com', name: 'Người ký B', order: 1 },
      { email: 'parallel3@test.com', name: 'Người ký C', order: 1 },
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
          signing_order: signer.order, // All same order = parallel
          signing_token: require('crypto').randomBytes(32).toString('hex'),
        },
      });
      createdSigners.push(signerRecord);
      console.log(`  ✅ Created: ${signer.name} (Order: ${signer.order})`);
    }
    console.log('');

    // Step 4: Update sign request to parallel workflow
    await prisma.sign_requests.update({
      where: { id: signRequestId },
      data: { workflow_type: 'parallel' },
    });
    console.log('✅ Sign request set to parallel workflow\n');

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
          otp_expire: new Date(Date.now() + 10 * 60 * 1000),
          status: 'otp_sent',
        },
      });
      
      otps[signer.id] = otp;
      console.log(`  ✅ ${signer.name}: OTP=${otp}`);
    }
    console.log('');

    // TEST CASE 1: Signer C signs first (should succeed - no order restriction)
    console.log('📋 TEST CASE 1: Signer C signs first (any order OK)');
    console.log('Expected: ✅ Success\n');
    
    try {
      const res = await axios.post(
        `${API_BASE}/public/sign/${createdSigners[2].signing_token}/sign`,
        {
          otp: otps[createdSigners[2].id],
          signature_data: 'data:image/png;base64,test',
          signature_type: 'drawn',
        }
      );
      console.log('✅ TEST PASSED: Signer C signed successfully');
      console.log(`   All signed: ${res.data.data.all_signed}\n`);
    } catch (error) {
      console.log('❌ TEST FAILED: Should have succeeded');
      console.log(`   Error: ${error.response?.data?.message || error.message}\n`);
    }

    // TEST CASE 2: Signer A signs second (should succeed)
    console.log('📋 TEST CASE 2: Signer A signs second');
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
      console.log('✅ TEST PASSED: Signer A signed successfully');
      console.log(`   All signed: ${res.data.data.all_signed}\n`);
    } catch (error) {
      console.log('❌ TEST FAILED: Should have succeeded');
      console.log(`   Error: ${error.response?.data?.message || error.message}\n`);
    }

    // TEST CASE 3: Signer B signs last (should complete)
    console.log('📋 TEST CASE 3: Signer B signs last');
    console.log('Expected: ✅ Success + All signed = true\n');
    
    try {
      const res = await axios.post(
        `${API_BASE}/public/sign/${createdSigners[1].signing_token}/sign`,
        {
          otp: otps[createdSigners[1].id],
          signature_data: 'data:image/png;base64,test',
          signature_type: 'drawn',
        }
      );
      console.log('✅ TEST PASSED: Signer B signed successfully');
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
      include: { signers: { orderBy: { id: 'asc' } } },
    });

    console.log('\nFinal Status:');
    console.log(`  Sign Request: ${finalSignRequest.status}`);
    finalSignRequest.signers.forEach((s) => {
      console.log(`  ${s.name}: ${s.status} (Order: ${s.signing_order})`);
    });

    console.log('\n✅ All tests completed!');
    console.log('📊 Summary: Parallel signing allows any order');

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
