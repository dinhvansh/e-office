const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestSigningSession() {
  console.log('🚀 Tạo phiên ký test hoàn chỉnh...\n');

  try {
    // Step 1: Login to get token
    console.log('1️⃣ Đăng nhập admin...');
    const loginResponse = await axios.post('http://localhost:4000/api/v1/auth/login', {
      email: 'admin@acme.local',
      password: 'password123'
    });
    const token = loginResponse.data.data.tokens.accessToken;
    console.log('✅ Đăng nhập thành công');

    // Step 2: Upload a document
    console.log('\n2️⃣ Tạo tài liệu mới...');
    const documentResponse = await axios.post(
      'http://localhost:4000/api/v1/documents',
      {
        file_name: 'hop-dong-test.pdf',
        storage_path: 'storage/1/1763525748086_test-decision-2.pdf',
        title: 'Hợp đồng test ký số',
        document_type_id: 1,
        require_digital_signing: true,
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const document = documentResponse.data.data.document;
    console.log(`✅ Tạo tài liệu thành công - ID: ${document.id}`);

    // Step 3: Create sign request with signer
    console.log('\n3️⃣ Tạo yêu cầu ký...');
    const signRequestResponse = await axios.post(
      'http://localhost:4000/api/v1/sign-requests',
      {
        document_id: document.id,
        title: 'Yêu cầu ký: ' + document.title,
        message: 'Vui lòng ký tài liệu này trong ngày hôm nay.',
        workflow_type: 'sequential',
        signers: [
          {
            email: 'test.signer@example.com',
            name: 'Nguyễn Văn Test',
            role: 'Người ký'
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const signRequest = signRequestResponse.data.data.sign_request;
    console.log(`✅ Tạo yêu cầu ký thành công - ID: ${signRequest.id}`);

    // Step 4: Add signature fields
    console.log('\n4️⃣ Thêm trường chữ ký...');
    
    // Get the signer ID
    const signer = await prisma.signers.findFirst({
      where: { sign_request_id: signRequest.id }
    });

    // Add signature field (very small, positioned in PDF content area)
    const signatureField = await prisma.sign_request_fields.create({
      data: {
        sign_request: { connect: { id: signRequest.id } },
        document: { connect: { id: document.id } },
        assigned_signer: { connect: { id: signer.id } },
        type: 'signature',
        page: 1,
        x: 15, // 15% from left (inside PDF margin)
        y: 75, // 75% from top (bottom area of PDF)
        width: 80, // Very small width
        height: 30, // Very small height
        required: true,
        label: 'Chữ ký',
        placeholder: 'Ký',
      }
    });

    // Add date field (positioned next to signature)
    const dateField = await prisma.sign_request_fields.create({
      data: {
        sign_request: { connect: { id: signRequest.id } },
        document: { connect: { id: document.id } },
        assigned_signer: { connect: { id: signer.id } },
        type: 'date',
        page: 1,
        x: 55, // Next to signature (15% + 40% gap)
        y: 75, // Same y as signature
        width: 70, // Small width
        height: 30, // Same height as signature
        required: true,
        label: 'Ngày',
        placeholder: 'DD/MM/YYYY',
      }
    });

    console.log(`✅ Thêm trường chữ ký - ID: ${signatureField.id}`);
    console.log(`✅ Thêm trường ngày - ID: ${dateField.id}`);

    // Step 5: Send sign request
    console.log('\n5️⃣ Gửi yêu cầu ký...');
    const sendResponse = await axios.post(
      `http://localhost:4000/api/v1/sign-requests/${signRequest.id}/send`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const sentSignRequest = sendResponse.data.data;
    console.log('Send response:', JSON.stringify(sentSignRequest, null, 2));
    const signingToken = sentSignRequest.sign_request.signers[0].signing_token;
    console.log('✅ Gửi yêu cầu ký thành công');
    console.log(`📧 Signing token: ${signingToken.substring(0, 20)}...`);

    // Step 6: Generate OTP
    console.log('\n6️⃣ Tạo OTP...');
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
    console.log(`✅ Tạo OTP thành công: ${otp}`);

    // Summary
    console.log('\n🎉 HOÀN THÀNH! Thông tin phiên ký:');
    console.log('=' .repeat(50));
    console.log(`📄 Tài liệu: ${document.title}`);
    console.log(`📝 Sign Request ID: ${signRequest.id}`);
    console.log(`👤 Người ký: test.signer@example.com`);
    console.log(`🔗 Signing URL: http://localhost:3000/sign/${signingToken}`);
    console.log(`🔑 OTP: ${otp}`);
    console.log(`📋 Signature Field ID: ${signatureField.id}`);
    console.log(`📅 Date Field ID: ${dateField.id}`);
    console.log('=' .repeat(50));
    
    console.log('\n📋 HƯỚNG DẪN TEST:');
    console.log('1. Mở URL signing trong browser');
    console.log('2. Nhập email: test.signer@example.com');
    console.log(`3. Nhập OTP: ${otp}`);
    console.log('4. Click "Bắt đầu" để vào guided mode');
    console.log('5. Ký các trường theo thứ tự');
    console.log('6. Submit để hoàn thành');

  } catch (error) {
    console.error('❌ Lỗi:', error.response?.data || error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestSigningSession();