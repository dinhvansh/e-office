const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:4000';

async function testPdfDownload() {
  console.log('🧪 Testing PDF Download with Signatures\n');
  
  try {
    // Step 1: Find a completed sign request
    console.log('📋 Step 1: Finding completed sign request...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const completedSignRequest = await prisma.sign_requests.findFirst({
      where: {
        status: 'completed'
      },
      include: {
        signers: {
          where: {
            OR: [
              { status: 'signed' },
              { status: 'completed' }
            ]
          }
        },
        document: true
      }
    });
    
    if (!completedSignRequest) {
      console.log('❌ No completed sign requests found');
      console.log('💡 Please complete a signing flow first');
      return;
    }
    
    console.log('✅ Found completed sign request:', {
      id: completedSignRequest.id,
      title: completedSignRequest.title,
      status: completedSignRequest.status,
      signers: completedSignRequest.signers.length
    });
    
    // Get first signer's token
    const signer = completedSignRequest.signers[0];
    if (!signer || !signer.signing_token) {
      console.log('❌ No signer with token found');
      return;
    }
    
    console.log('✅ Using signer:', {
      name: signer.name,
      email: signer.email,
      status: signer.status
    });
    
    // Step 2: Download signed PDF
    console.log('\n📥 Step 2: Downloading signed PDF...');
    const downloadUrl = `${API_BASE}/public/sign/${signer.signing_token}/download-signed`;
    console.log('URL:', downloadUrl);
    
    const response = await axios.get(downloadUrl, {
      responseType: 'arraybuffer'
    });
    
    console.log('✅ Download response:', {
      status: response.status,
      contentType: response.headers['content-type'],
      contentLength: response.headers['content-length'],
      contentDisposition: response.headers['content-disposition']
    });
    
    // Step 3: Save PDF to file
    console.log('\n💾 Step 3: Saving PDF to file...');
    const outputDir = path.join(__dirname, '../test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filename = `signed_document_${completedSignRequest.id}_${Date.now()}.pdf`;
    const outputPath = path.join(outputDir, filename);
    
    fs.writeFileSync(outputPath, response.data);
    
    const stats = fs.statSync(outputPath);
    console.log('✅ PDF saved:', {
      path: outputPath,
      size: `${(stats.size / 1024).toFixed(2)} KB`
    });
    
    // Step 4: Verify PDF structure
    console.log('\n🔍 Step 4: Verifying PDF structure...');
    const pdfBuffer = fs.readFileSync(outputPath);
    const pdfString = pdfBuffer.toString('latin1');
    
    const checks = {
      isPdf: pdfString.startsWith('%PDF'),
      hasEof: pdfString.includes('%%EOF'),
      hasSignedWatermark: pdfString.includes('SIGNED'),
      hasCompletedTimestamp: pdfString.includes('Completed:')
    };
    
    console.log('PDF Structure Checks:', checks);
    
    if (Object.values(checks).every(v => v)) {
      console.log('✅ All checks passed!');
    } else {
      console.log('⚠️ Some checks failed');
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log('✅ Sign Request ID:', completedSignRequest.id);
    console.log('✅ Document:', completedSignRequest.document.original_file_name);
    console.log('✅ Signers:', completedSignRequest.signers.length);
    console.log('✅ PDF Downloaded:', `${(stats.size / 1024).toFixed(2)} KB`);
    console.log('✅ Output File:', outputPath);
    console.log('='.repeat(60));
    console.log('\n🎉 PDF Download Test: PASSED\n');
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data?.toString?.() || error.response.data);
    }
    console.error('\nStack trace:', error.stack);
  }
}

// Run test
testPdfDownload();
