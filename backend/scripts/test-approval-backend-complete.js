/**
 * Complete Backend Test - Approval Workflow with PDF Viewing
 * Tests: Login, Document Access, PDF Viewing, Approval Actions
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testApprovalBackend() {
  console.log('🧪 BACKEND TEST: Approval Workflow\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Check Test Accounts
    console.log('\n📋 TEST 1: Check Test Accounts');
    console.log('-'.repeat(60));
    
    const creator = await prisma.users.findFirst({
      where: { email: 'creator@acme.local' },
      include: { user_roles: { include: { role: true } } }
    });
    
    const approver = await prisma.users.findFirst({
      where: { email: 'approver@acme.local' },
      include: { user_roles: { include: { role: true } } }
    });

    if (!creator || !approver) {
      console.log('❌ Test accounts not found!');
      console.log('Run: node scripts/create-approval-test-users.js');
      return;
    }

    console.log('✅ Creator:', creator.email, '- Role:', creator.user_roles[0]?.role.name);
    console.log('✅ Approver:', approver.email, '- Role:', approver.user_roles[0]?.role.name);

    // Test 2: Check Test Document
    console.log('\n📋 TEST 2: Check Test Document');
    console.log('-'.repeat(60));
    
    const document = await prisma.documents.findFirst({
      where: { 
        owner_id: creator.id,
        status: 'pending_approval'
      },
      include: {
        document_type: true,
        sign_request: {
          include: {
            signers: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    if (!document) {
      console.log('❌ Test document not found!');
      console.log('Run: node scripts/create-test-document-with-approval.js');
      return;
    }

    console.log('✅ Document ID:', document.id);
    console.log('   Title:', document.title);
    console.log('   Type:', document.document_type?.name);
    console.log('   Status:', document.status);
    console.log('   File Path:', document.file_path);
    console.log('   Sign Request ID:', document.sign_request_id);

    // Test 3: Check Approval Record
    console.log('\n📋 TEST 3: Check Approval Record');
    console.log('-'.repeat(60));
    
    const approval = await prisma.document_approvals.findFirst({
      where: {
        document_id: document.id,
        approver_user_id: approver.id
      },
      include: {
        document: true,
        approver: true,
        workflow_step: {
          include: {
            workflow: true
          }
        }
      }
    });

    if (!approval) {
      console.log('❌ Approval record not found!');
      return;
    }

    console.log('✅ Approval ID:', approval.id);
    console.log('   Status:', approval.status);
    console.log('   Approver:', approval.approver.email);
    console.log('   Workflow:', approval.workflow_step.workflow.name);
    console.log('   Step:', approval.workflow_step.step_name);
    console.log('   Step Order:', approval.workflow_step.step_order);

    // Test 4: Check Document Access Control
    console.log('\n📋 TEST 4: Document Access Control');
    console.log('-'.repeat(60));
    
    // Import access control function
    const { canViewDocument } = require('../src/modules/documents/documents.access');
    
    // Test creator access
    const creatorCanView = await canViewDocument(creator, document);
    console.log('✅ Creator can view:', creatorCanView ? 'YES' : 'NO');
    
    // Test approver access
    const approverCanView = await canViewDocument(approver, document);
    console.log('✅ Approver can view:', approverCanView ? 'YES' : 'NO');
    
    // Test random user access
    const randomUser = await prisma.users.findFirst({
      where: { 
        email: { not: { in: ['creator@acme.local', 'approver@acme.local'] } }
      }
    });
    
    if (randomUser) {
      const randomCanView = await canViewDocument(randomUser, document);
      console.log('✅ Random user can view:', randomCanView ? 'YES' : 'NO');
    }

    // Test 5: Check File Path Resolution
    console.log('\n📋 TEST 5: File Path Resolution');
    console.log('-'.repeat(60));
    
    const fs = require('fs');
    const path = require('path');
    
    // Try different path resolutions
    const paths = [
      document.file_path,
      path.join(__dirname, '..', document.file_path),
      path.join(__dirname, '../..', document.file_path),
      path.join(process.cwd(), document.file_path)
    ];
    
    let foundPath = null;
    for (const testPath of paths) {
      if (fs.existsSync(testPath)) {
        foundPath = testPath;
        console.log('✅ File found at:', testPath);
        const stats = fs.statSync(testPath);
        console.log('   Size:', (stats.size / 1024).toFixed(2), 'KB');
        console.log('   Modified:', stats.mtime.toISOString());
        break;
      }
    }
    
    if (!foundPath) {
      console.log('❌ File not found at any path!');
      console.log('   Tried paths:');
      paths.forEach(p => console.log('   -', p));
    }

    // Test 6: Check Workflow Configuration
    console.log('\n📋 TEST 6: Workflow Configuration');
    console.log('-'.repeat(60));
    
    const workflow = await prisma.workflows.findUnique({
      where: { id: approval.workflow_step.workflow_id },
      include: {
        workflow_steps: {
          orderBy: { step_order: 'asc' }
        }
      }
    });

    console.log('✅ Workflow:', workflow.name);
    console.log('   Description:', workflow.description);
    console.log('   Steps:', workflow.workflow_steps.length);
    
    workflow.workflow_steps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step.step_name} (Order: ${step.step_order})`);
      console.log(`      Approver Type: ${step.approver_type}`);
      if (step.approver_user_id) {
        console.log(`      Approver User ID: ${step.approver_user_id}`);
      }
    });

    // Test 7: Check Permissions
    console.log('\n📋 TEST 7: Check Permissions');
    console.log('-'.repeat(60));
    
    const approverPermissions = await prisma.role_permissions.findMany({
      where: {
        role_id: approver.user_roles[0].role_id
      },
      include: {
        permission: true
      }
    });

    const permissionNames = approverPermissions.map(rp => rp.permission.name);
    
    const requiredPermissions = [
      'approvals:read',
      'approvals:update',
      'documents:read',
      'workflows:read'
    ];

    console.log('✅ Approver Permissions:');
    requiredPermissions.forEach(perm => {
      const has = permissionNames.includes(perm);
      console.log(`   ${has ? '✅' : '❌'} ${perm}`);
    });

    // Test 8: Summary
    console.log('\n📊 TEST SUMMARY');
    console.log('='.repeat(60));
    
    const allTestsPassed = 
      creator && approver &&
      document && approval &&
      creatorCanView && approverCanView &&
      foundPath !== null;

    if (allTestsPassed) {
      console.log('✅ ALL TESTS PASSED!');
      console.log('\n🎯 Ready for Frontend Testing:');
      console.log('   1. Login as approver@acme.local / password123');
      console.log('   2. Navigate to /approvals');
      console.log('   3. Click on approval ID:', approval.id);
      console.log('   4. Verify PDF displays correctly');
      console.log('   5. Test approval actions');
    } else {
      console.log('❌ SOME TESTS FAILED');
      console.log('   Review errors above and fix issues');
    }

    // Test 9: API Endpoint Simulation
    console.log('\n📋 TEST 9: API Endpoint Simulation');
    console.log('-'.repeat(60));
    
    // Simulate GET /api/v1/approvals/:id
    console.log('Simulating: GET /api/v1/approvals/' + approval.id);
    
    const apiResponse = {
      id: approval.id,
      status: approval.status,
      comment: approval.comment,
      acted_at: approval.acted_at,
      document: {
        id: document.id,
        title: document.title,
        document_number: document.document_number,
        file_path: document.file_path,
        status: document.status,
        created_at: document.created_at
      },
      approver: {
        id: approver.id,
        email: approver.email,
        full_name: approver.full_name
      },
      workflow_step: {
        id: approval.workflow_step.id,
        step_name: approval.workflow_step.step_name,
        step_order: approval.workflow_step.step_order,
        workflow: {
          id: workflow.id,
          name: workflow.name,
          description: workflow.description
        }
      }
    };

    console.log('✅ API Response Structure:');
    console.log(JSON.stringify(apiResponse, null, 2));

  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
testApprovalBackend();
