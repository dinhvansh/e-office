#!/usr/bin/env node
/**
 * Fix signer 97 - generate token
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Fixing Signer 97 ===\n');

  const signer = await prisma.signers.findUnique({
    where: { id: 97 },
    include: {
      sign_request: {
        include: {
          document: true
        }
      }
    }
  });

  if (!signer) {
    console.log('❌ Signer 97 not found');
    return;
  }

  console.log('📝 Current Signer Info:');
  console.log(`   Name: ${signer.name}`);
  console.log(`   Email: ${signer.email}`);
  console.log(`   Status: ${signer.status}`);
  console.log(`   Token: ${signer.signing_token || 'MISSING!'}`);
  console.log(`   Document: ${signer.sign_request.document.document_number}`);
  console.log('');

  if (signer.signing_token) {
    console.log('✅ Token already exists');
    console.log(`\n🔗 Signing URL: http://localhost:3000/sign/${signer.signing_token}`);
    return;
  }

  // Generate new token
  const token = crypto.randomBytes(32).toString('hex');
  
  await prisma.signers.update({
    where: { id: 97 },
    data: {
      signing_token: token,
      token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  });

  console.log('✅ Token generated!');
  console.log(`   Token: ${token}`);
  console.log(`\n🔗 Signing URL: http://localhost:3000/sign/${token}`);
  console.log('\n💡 Send this link to vanqn95@gmail.com to sign the document');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
