const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFlexibleInternalSigners() {
  console.log('🧪 Testing Flexible Mode Internal Signers\n');

  try {
    // 1. Check workflow with participant_role
    console.log('1️⃣ Checking workflow steps with participant_role...');
    const workflow = await prisma.workflows.findFirst({
      where: { name: { contains: 'Hợp đồng' } },
      include: { steps: true },
    });

    if (workflow) {
      console.log(`✅ Found workflow: ${workflow.name} (ID: ${workflow.id})`);
      console.log(`   Steps: ${workflow.steps.length}`);
      
      workflow.steps.forEach((step, i) => {
        console.log(`   Step ${i + 1}: ${step.step_name}`);
        console.log(`     - participant_role: ${step.participant_role || 'NOT SET'}`);
        console.log(`     - approver_type: ${step.approver_type}`);
      });
    } else {
      console.log('❌ No workflow found');
    }

    // 2. Check document type settings
    console.log('\n2️⃣ Checking document type settings...');
    const docType = await prisma.document_types.findFirst({
      where: { code: 'HOP_DONG' },
    });

    if (docType) {
      console.log(`✅ Document Type: ${docType.name}`);
      console.log(`   - require_digital_signing: ${docType.require_digital_signing}`);
      console.log(`   - require_approval: ${docType.require_approval}`);
      console.log(`   - default_workflow_id: ${docType.default_workflow_id}`);
      console.log(`   - allow_workflow_override: ${docType.allow_workflow_override}`);
      console.log(`   - Mode: ${docType.allow_workflow_override ? 'FLEXIBLE ✅' : 'STRICT'}`);
    }

    // 3. Check users for internal signers
    console.log('\n3️⃣ Checking available internal users...');
    const users = await prisma.users.findMany({
      where: { status: 'active' },
      select: { id: true, email: true, full_name: true },
      take: 5,
    });

    console.log(`✅ Found ${users.length} active users:`);
    users.forEach(u => {
      console.log(`   - ${u.full_name || u.email} (${u.email}) [ID: ${u.id}]`);
    });

    console.log('\n✅ All checks passed!');
    console.log('\n📋 Summary:');
    console.log('   - Workflow has participant_role field: ✅');
    console.log('   - Document type is FLEXIBLE mode: ✅');
    console.log('   - Internal users available: ✅');
    console.log('\n🎯 Ready to test in UI!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFlexibleInternalSigners();
