const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkWebhooks() {
  try {
    console.log('🔍 Checking webhooks in database...\n');
    
    const webhooks = await prisma.webhooks.findMany({
      orderBy: { created_at: 'desc' }
    });

    console.log(`📊 Total webhooks: ${webhooks.length}\n`);

    if (webhooks.length === 0) {
      console.log('⚠️ No webhooks found in database');
    } else {
      webhooks.forEach((webhook, index) => {
        console.log(`${index + 1}. Webhook ID: ${webhook.id}`);
        console.log(`   Tenant: ${webhook.tenant_id}`);
        console.log(`   URL: ${webhook.url}`);
        console.log(`   Events: ${webhook.events.join(', ')}`);
        console.log(`   Active: ${webhook.active}`);
        console.log(`   Created: ${webhook.created_at}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWebhooks();
