/**
 * Generate signing tokens for signers that don't have one
 * This allows external signers to access the public signing page
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function generateSigningTokens() {
  console.log('🔑 Generating signing tokens for signers...\n');

  try {
    // Find signers without tokens
    const signersWithoutTokens = await prisma.signers.findMany({
      where: {
        OR: [
          { signing_token: null },
          { signing_token: '' },
        ],
        status: {
          not: 'completed', // Don't update completed signers
        },
      },
      include: {
        sign_request: {
          include: {
            document: {
              select: {
                id: true,
                title: true,
                original_file_name: true,
              },
            },
          },
        },
      },
    });

    if (signersWithoutTokens.length === 0) {
      console.log('✅ All signers already have tokens!');
      return;
    }

    console.log(`📋 Found ${signersWithoutTokens.length} signers without tokens\n`);

    // Generate and update tokens
    const updates = [];
    for (const signer of signersWithoutTokens) {
      const token = generateToken();
      
      await prisma.signers.update({
        where: { id: signer.id },
        data: { signing_token: token },
      });

      updates.push({
        id: signer.id,
        name: signer.name,
        email: signer.email,
        token: token,
        document: signer.sign_request.document.title || 
                  signer.sign_request.document.original_file_name || 
                  `Document #${signer.sign_request.document.id}`,
      });

      console.log(`✅ Signer #${signer.id} - ${signer.name || signer.email}`);
      console.log(`   Token: ${token}`);
      console.log(`   Document: ${updates[updates.length - 1].document}`);
      console.log(`   Link: http://localhost:3000/sign/${token}\n`);
    }

    console.log('═'.repeat(60));
    console.log(`\n🎉 Generated ${updates.length} signing tokens!\n`);
    
    // Print summary
    console.log('📝 Summary of signing links:\n');
    updates.forEach((update, index) => {
      console.log(`${index + 1}. ${update.name || update.email}`);
      console.log(`   Document: ${update.document}`);
      console.log(`   Link: http://localhost:3000/sign/${update.token}\n`);
    });

    console.log('═'.repeat(60));
    console.log('\n💡 Tips:');
    console.log('   - Copy a link and open in browser');
    console.log('   - Enter the signer email');
    console.log('   - Request OTP');
    console.log('   - Sign the document\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generateSigningTokens();
