const axios = require("axios");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:4000/api/v1";

const TEST_USER = {
  email: "admin@acme.local",
  password: "secret123",
};

let authToken = "";
let apiToken = "";

async function login() {
  const response = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
  authToken = response.data.data.tokens.accessToken;
  console.log("Login success");
}

async function createWebhook() {
  const response = await axios.post(
    `${BASE_URL}/webhooks`,
    {
      url: "https://webhook.site/unique-id",
      events: ["document.created", "sign.completed"],
      secret: "my-secret-key",
      active: true,
    },
    {
      headers: { Authorization: `Bearer ${authToken}` },
    }
  );

  console.log("Webhook created:", response.data.data.id);
  return response.data.data;
}

async function listWebhooks(token = authToken) {
  const response = await axios.get(`${BASE_URL}/webhooks`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  console.log("Webhooks count:", response.data.data.length);
  return response.data.data;
}

async function updateWebhook(id) {
  const response = await axios.put(
    `${BASE_URL}/webhooks/${id}`,
    {
      active: false,
      events: ["document.created", "sign.completed", "approval.completed"],
    },
    {
      headers: { Authorization: `Bearer ${authToken}` },
    }
  );

  console.log("Webhook updated:", response.data.data.id);
  return response.data.data;
}

async function getWebhookLogs(id) {
  const response = await axios.get(`${BASE_URL}/webhooks/${id}/logs`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  console.log("Webhook logs fetched:", response.data.data.length);
  return response.data.data;
}

async function deleteWebhook(id) {
  const response = await axios.delete(`${BASE_URL}/webhooks/${id}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  console.log("Webhook deleted:", response.data.data.deleted);
  return response.data.data;
}

async function createApiToken() {
  const response = await axios.post(
    `${BASE_URL}/webhooks/api-tokens`,
    {
      name: `Integration Test ${Date.now()}`,
    },
    {
      headers: { Authorization: `Bearer ${authToken}` },
    }
  );

  apiToken = response.data.data.token;
  console.log("API token created:", response.data.data.metadata.id);
  return response.data.data.metadata;
}

async function listApiTokens() {
  const response = await axios.get(`${BASE_URL}/webhooks/api-tokens`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  console.log("API tokens count:", response.data.data.length);
  return response.data.data;
}

async function revokeApiToken(id) {
  const response = await axios.delete(`${BASE_URL}/webhooks/api-tokens/${id}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  console.log("API token revoked:", response.data.data.id);
  return response.data.data;
}

async function verifyApiTokenCanCallProtectedRoute() {
  const items = await listWebhooks(apiToken);
  console.log("API token can call protected route:", Array.isArray(items));
}

async function main() {
  try {
    console.log("Testing webhook and API token flow");

    await login();

    const webhook = await createWebhook();
    await listWebhooks();
    await updateWebhook(webhook.id);
    await getWebhookLogs(webhook.id);

    const tokenMeta = await createApiToken();
    await listApiTokens();
    await verifyApiTokenCanCallProtectedRoute();
    await revokeApiToken(tokenMeta.id);

    await deleteWebhook(webhook.id);
    await listWebhooks();

    console.log("All webhook tests completed");
  } catch (error) {
    console.error("Webhook test failed:", error.response?.data || error.message);
    process.exit(1);
  }
}

main();
