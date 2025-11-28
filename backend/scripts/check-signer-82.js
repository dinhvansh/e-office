#!/usr/bin/env node
/**
 * Check signer details for sign request 82
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Checking Sign Request 82 Signers ===\n');

  const signers = await prisma.signers.findMany({
    where: {
      sign_request_id: 82
    },
    include: {
      user: true
    }
  });

  console.log(`Found ${signers.length} signers:\n`);

  signers.forEach((signer, index) => {
    console.log(`${index + 1}. ${signer.name} (${signer.email})`);
    console.log(`   ID: ${signer.id}`);
    console.log(`   User ID: ${signer.user_id || 'N/A'}`);
    console.log(`   Status: ${signer.status}`);
    console.log(`   Role: ${signer.role}`);
    console.log(`   Order: ${signer.signing_order}`);
    console.log(`   Has Signature: ${signer.signature_data ? 'Yes' : 'No'}`);
    if (signer.signature_data) {
      console.log(`   Signature Length: ${signer.signature_data.length} chars`);
    }
    console.log(`   Signed At: ${signer.signed_at || 'Not signed'}`);
    console.log(`   Created At: ${signer.created_at}`);
    console.log('');
  });

  // Check if there's a user with email vanqn95@gmail.com
  const vanUser = await prisma.users.findFirst({
    where: {
      email: 'vanqn95@gmail.com'
    }
  });

  if (vanUser) {
    console.log('👤 Van User Found:');
    console.log(`   ID: ${vanUser.id}`);
    console.log(`   Email: ${vanUser.email}`);
    console.log(`   Name: ${vanUser.full_name}`);
    console.log('');

    // Check if signer has this user_id
    const signerWithUserId = signers.find(s => s.user_id === vanUser.id);
    if (signerWithUserId) {
      console.log('✅ Signer is linked to user');
    } else {
      console.log('⚠️  Signer is NOT linked to user (user_id is null)');
      console.log('   This might cause issues with internal signing');
    }
  } else {
    console.log('❌ No user found with email vanqn95@gmail.com');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
