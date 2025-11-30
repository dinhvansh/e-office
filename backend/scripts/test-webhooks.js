const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api/v1';

// Test credentials
const TEST_USER = {
  email: 'admin@acme.local',
  password: 'admin123'
};

let authToken = '';

async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    authToken = response.data.data.tokens.accessToken;
    console.log('✅ Logged in successfully');
    return authToken;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function createWebhook() {
  try {
    const response = await axios.post(
      `${BASE_URL}/webhooks`,
      {
        url: 'https://webhook.site/unique-id',
        events: ['document.created', 'sign.completed'],
        secret: 'my-secret-key',
        active: true
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    console.log('✅ Webhook created:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Create webhook failed:', error.response?.data || error.message);
  }
}

async function listWebhooks() {
  try {
    const response = await axios.get(`${BASE_URL}/webhooks`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Webhooks list:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ List webhooks failed:', error.response?.data || error.message);
  }
}

async function updateWebhook(id) {
  try {
    const response = await axios.put(
      `${BASE_URL}/webhooks/${id}`,
      {
        active: false,
        events: ['document.created', 'sign.completed', 'approval.completed']
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    console.log('✅ Webhook updated:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Update webhook failed:', error.response?.data || error.message);
  }
}

async function getWebhookLogs(id) {
  try {
    const response = await axios.get(`${BASE_URL}/webhooks/${id}/logs`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Webhook logs:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Get webhook logs failed:', error.response?.data || error.message);
  }
}

async function deleteWebhook(id) {
  try {
    const response = await axios.delete(`${BASE_URL}/webhooks/${id}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Webhook deleted:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Delete webhook failed:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('🚀 Testing Webhooks API...\n');

  await login();

  // Create webhook
  const webhook = await createWebhook();
  if (!webhook) return;

  console.log('');

  // List webhooks
  await listWebhooks();
  console.log('');

  // Update webhook
  await updateWebhook(webhook.id);
  console.log('');

  // Get webhook logs
  await getWebhookLogs(webhook.id);
  console.log('');

  // Delete webhook
  await deleteWebhook(webhook.id);
  console.log('');

  // List webhooks again
  await listWebhooks();

  console.log('\n✅ All tests completed!');
}

main().catch(console.error);
