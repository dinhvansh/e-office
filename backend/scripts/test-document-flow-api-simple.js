// Simple test using existing test pattern
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDocumentFlowService() {
  console.log('🧪 Testing Document Flow Service\n');

  try {
    // 1. Find a document with sign request
    console.log('1️⃣ Finding document with sign request...');
    const document = await prisma.documents.findFirst({
      where: {
        sign_request_id: { not: null },
      },
      include: {
        sign_request: {
          include: {
            signers: true,
          },
        },
        workflow_instance: true,
        approvals: true,
      },
    });

    if (!document) {
      console.log('⚠️ No document found with sign request');
      return;
    }

    console.log(`✅ Found document: ${document.title} (ID: ${document.id})`);
    console.log(`   - Has sign request: ${!!document.sign_request_id}`);
    console.log(`   - Has workflow: ${!!document.workflow_instance}`);
    console.log(`   - Signers: ${document.sign_request?.signers.length || 0}`);
    console.log(`   - Approvals: ${document.approvals?.length || 0}\n`);

    // 2. Test service directly
    console.log('2️⃣ Testing DocumentFlowService...');
    const { documentFlowService } = require('../src/modules/documentFlow/documentFlow.service');
    
    const flowData = await documentFlowService.getDocumentFlow(
      document.id,
      document.tenant_id,
      1 // admin user id
    );

    console.log('✅ Service returned data\n');

    // 3. Verify structure
    console.log('3️⃣ Verifying response structure...');
    console.log(`✅ Document: ${flowData.document.title}`);
    console.log(`   - ID: ${flowData.document.id}`);
    console.log(`   - Status: ${flowData.document.status}`);
    console.log(`   - Owner: ${flowData.document.owner.name}\n`);

    console.log(`✅ Phases: ${flowData.phases.length} phases`);
    flowData.phases.forEach(phase => {
      console.log(`   - ${phase.label}: ${phase.status}`);
    });
    console.log('');

    console.log(`✅ Steps: ${flowData.steps.length} steps`);
    flowData.steps.forEach(step => {
      console.log(`   - Step ${step.order}: ${step.type} - ${step.status}`);
      if (step.user) {
        console.log(`     User: ${step.user.name}`);
      }
    });
    console.log('');

    console.log(`✅ Activities: ${flowData.activities.length} activities`);
    flowData.activities.slice(0, 5).forEach(activity => {
      console.log(`   - ${activity.actor}: ${activity.action}`);
    });
    if (flowData.activities.length > 5) {
      console.log(`   ... and ${flowData.activities.length - 5} more`);
    }
    console.log('');

    console.log(`✅ Permissions:`);
    console.log(`   - Can approve: ${flowData.can_approve}`);
    console.log(`   - Can sign: ${flowData.can_sign}\n`);

    console.log('🎉 All tests passed!\n');

    // 4. Show sample data
    console.log('📋 Sample Response:');
    console.log(JSON.stringify(flowData, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDocumentFlowService();
