/**
 * Complete verification of PDF load functionality
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function verifyComplete() {
  console.log('🔍 Complete PDF Load Verification\n');
  console.log('='.repeat(60));
  
  const results = {
    backend_api: false,
    file_exists: false,
    path_resolution: false,
    approval_exists: false
  };

  try {
    // 1. Check backend API
    console.log('\n1️⃣ Testing Backend API...');
    const loginRes = await axios.post('http://localhost:4000/api/v1/auth/login', {
      email: 'admin@acme.local',
      password: 'password123'
    });
    const token = loginRes.data.data.tokens.accessToken;
    
    const docsRes = await axios.get('http://localhost:4000/api/v1/documents', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const docs = docsRes.data.data.documents || docsRes.data.data;
    
    if (docs && docs.length > 0) {
      const doc = docs[0];
      console.log(`   ✅ Found document ID: ${doc.id}`);
      
      // Test view endpoint
      const viewRes = await axios.get(`http://localhost:4000/api/v1/documents/${doc.id}/view`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'arraybuffer'
      });
      
      if (viewRes.status === 200) {
        console.log(`   ✅ Backend API working (${(viewRes.data.length / 1024).toFixed(2)} KB)`);
        results.backend_api = true;
      }
    }
  } catch (error) {
    console.log(`   ❌ Backend API failed: ${error.message}`);
  }

  // 2. Check file exists
  console.log('\n2️⃣ Checking File System...');
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const doc = await prisma.documents.findFirst({
      orderBy: { id: 'desc' }
    });
    
    if (doc) {
      const filePath = path.resolve(process.cwd(), doc.file_path);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`   ✅ File exists: ${(stats.size / 1024).toFixed(2)} KB`);
        results.file_exists = true;
        results.path_resolution = true;
      } else {
        console.log(`   ❌ File not found: ${filePath}`);
      }
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.log(`   ❌ File check failed: ${error.message}`);
  }

  // 3. Check approval exists
  console.log('\n3️⃣ Checking Approval...');
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const approval = await prisma.document_approvals.findFirst({
      where: { action: 'pending' },
      include: {
        document: true,
        approver: { select: { email: true } }
      },
      orderBy: { id: 'desc' }
    });
    
    if (approval) {
      console.log(`   ✅ Approval ID: ${approval.id}`);
      console.log(`   Document ID: ${approval.document_id}`);
      console.log(`   Approver: ${approval.approver.email}`);
      console.log(`   URL: http://localhost:3000/approvals/${approval.id}`);
      results.approval_exists = true;
    } else {
      console.log(`   ⚠️  No pending approvals found`);
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.log(`   ❌ Approval check failed: ${error.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 VERIFICATION SUMMARY:\n');
  console.log(`   Backend API:       ${results.backend_api ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   File Exists:       ${results.file_exists ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Path Resolution:   ${results.path_resolution ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Approval Exists:   ${results.approval_exists ? '✅ PASS' : '⚠️  WARN'}`);
  
  const allPass = results.backend_api && results.file_exists && results.path_resolution;
  
  console.log('\n' + '='.repeat(60));
  if (allPass) {
    console.log('\n✅ ALL CHECKS PASSED - Backend is working correctly!');
    console.log('\n💡 If frontend still has issues:');
    console.log('   1. Hard refresh browser: Ctrl + Shift + R');
    console.log('   2. Check browser console for errors');
    console.log('   3. Verify NEXT_PUBLIC_API_BASE_URL in frontend/.env.local');
    console.log('   4. Restart frontend dev server');
  } else {
    console.log('\n❌ SOME CHECKS FAILED - Please fix backend issues first');
  }
  console.log('');
}

verifyComplete();
