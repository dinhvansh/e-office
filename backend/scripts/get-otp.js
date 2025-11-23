/**
 * Get OTP for a signer by email or token
 * Usage: node scripts/get-otp.js [email or token]
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function getOTP(searchTerm) {
  try {
    let signer;

    // Try to find by token first
    if (searchTerm && searchTerm.length > 20) {
      signer = await prisma.signers.findUnique({
        where: { signing_token: searchTerm },
        include: {
          sign_request: {
            include: {
              document: {
                select: {
                  title: true,
                  original_file_name: true,
                },
              },
            },
          },
        },
      });
    }

    // If not found, try by email
    if (!signer && searchTerm) {
      signer = await prisma.signers.findFirst({
        where: { email: searchTerm },
        orderBy: { id: 'desc' },
        include: {
          sign_request: {
            include: {
              document: {
                select: {
                  title: true,
                  original_file_name: true,
                },
              },
            },
          },
        },
      });
    }

    // If still not found, get the latest signer
    if (!signer) {
      signer = await prisma.signers.findFirst({
        orderBy: { id: 'desc' },
        include: {
          sign_request: {
            include: {
              document: {
                select: {
                  title: true,
                  original_file_name: true,
                },
              },
            },
          },
        },
      });
    }

    if (!signer) {
      console.log('❌ No signers found in database');
      return;
    }

    console.log('\n📋 Signer Information:');
    console.log('═'.repeat(60));
    console.log(`ID: ${signer.id}`);
    console.log(`Name: ${signer.name}`);
    console.log(`Email: ${signer.email}`);
    console.log(`Status: ${signer.status}`);
    console.log(`Document: ${signer.sign_request.document.title || signer.sign_request.document.original_file_name}`);
    console.log('═'.repeat(60));

    if (!signer.otp) {
      console.log('\n⚠️  No OTP found. Generating new OTP...\n');
      
      // Generate new OTP
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = await bcrypt.hash(newOtp, 10);
      const otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await prisma.signers.update({
        where: { id: signer.id },
        data: {
          otp: hashedOtp,
          otp_expire: otpExpire,
        },
      });

      console.log('✅ New OTP generated!');
      console.log('═'.repeat(60));
      console.log(`\n🔑 OTP: ${newOtp}\n`);
      console.log('═'.repeat(60));
      console.log(`Expires: ${otpExpire.toLocaleString('vi-VN')}`);
      console.log(`Valid for: 10 minutes`);
    } else {
      // OTP exists but is hashed, generate new one
      console.log('\n⚠️  OTP is hashed in database. Generating new OTP...\n');
      
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = await bcrypt.hash(newOtp, 10);
      const otpExpire = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.signers.update({
        where: { id: signer.id },
        data: {
          otp: hashedOtp,
          otp_expire: otpExpire,
        },
      });

      console.log('✅ New OTP generated!');
      console.log('═'.repeat(60));
      console.log(`\n🔑 OTP: ${newOtp}\n`);
      console.log('═'.repeat(60));
      console.log(`Expires: ${otpExpire.toLocaleString('vi-VN')}`);
      console.log(`Valid for: 10 minutes`);
    }

    if (signer.signing_token) {
      console.log('\n📎 Signing Link:');
      console.log(`http://localhost:3000/sign/${signer.signing_token}`);
    }

    console.log('\n💡 Usage:');
    console.log('1. Open the signing link in browser');
    console.log(`2. Enter email: ${signer.email}`);
    console.log('3. Click "Gửi mã OTP"');
    console.log('4. Enter the OTP above');
    console.log('5. Sign the document\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Get search term from command line or use latest
const searchTerm = process.argv[2];

if (searchTerm) {
  console.log(`\n🔍 Searching for: ${searchTerm}\n`);
} else {
  console.log('\n🔍 Getting latest signer...\n');
}

getOTP(searchTerm);
