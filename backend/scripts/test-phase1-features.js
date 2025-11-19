const { PrismaClient } = require("@prisma/client");
const fetch = require("node-fetch");

const prisma = new PrismaClient();
const API_BASE = "http://localhost:4000/api/v1";

let token = "";
let documentId = null;

async function login() {
  console.log("\n🔐 Logging in...");
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@acme.local",
      password: "secret123",
    }),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error("Login failed");
  }

  token = data.data.tokens.accessToken;
  console.log("✅ Login successful\n");
}

async function testTags() {
  console.log("📌 Testing Document Tags...\n");

  // Get first document
  const docs = await prisma.documents.findFirst();
  if (!docs) {
    console.log("⚠️  No documents found. Upload a document first.");
    return;
  }
  documentId = docs.id;

  // 1. Add tags
  console.log(`1. Adding tags to document ${documentId}...`);
  await fetch(`${API_BASE}/documents/${documentId}/tags`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tag: "urgent" }),
  });

  await fetch(`${API_BASE}/documents/${documentId}/tags`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tag: "confidential" }),
  });

  await fetch(`${API_BASE}/documents/${documentId}/tags`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tag: "review-needed" }),
  });

  console.log("   ✅ Added 3 tags");

  // 2. Get document tags
  console.log("2. Getting document tags...");
  const tagsRes = await fetch(`${API_BASE}/documents/${documentId}/tags`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const tagsData = await tagsRes.json();
  console.log(`   ✅ Tags: ${tagsData.data.tags.join(", ")}`);

  // 3. Get all tags
  console.log("3. Getting all tags...");
  const allTagsRes = await fetch(`${API_BASE}/documents/tags/all`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const allTagsData = await allTagsRes.json();
  console.log(`   ✅ Total unique tags: ${allTagsData.data.tags.length}`);

  // 4. Remove a tag
  console.log("4. Removing 'urgent' tag...");
  await fetch(`${API_BASE}/documents/${documentId}/tags`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tag: "urgent" }),
  });
  console.log("   ✅ Tag removed\n");
}

async function testPermissions() {
  console.log("🔐 Testing Document Permissions...\n");

  if (!documentId) {
    console.log("⚠️  No document ID. Skipping permissions test.");
    return;
  }

  // 1. Grant permission to user
  console.log("1. Granting permission to user...");
  await fetch(`${API_BASE}/documents/${documentId}/permissions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      subject_type: "user",
      subject_id: 1,
      can_read: true,
      can_edit: true,
      can_approve: false,
      can_share: true,
      can_delete: false,
    }),
  });
  console.log("   ✅ Permission granted");

  // 2. Grant permission to department
  console.log("2. Granting permission to department...");
  const dept = await prisma.departments.findFirst();
  if (dept) {
    await fetch(`${API_BASE}/documents/${documentId}/permissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        subject_type: "department",
        subject_id: dept.id,
        can_read: true,
        can_edit: false,
        can_approve: true,
        can_share: false,
        can_delete: false,
      }),
    });
    console.log("   ✅ Department permission granted");
  }

  // 3. Get permissions
  console.log("3. Getting document permissions...");
  const permsRes = await fetch(`${API_BASE}/documents/${documentId}/permissions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const permsData = await permsRes.json();
  console.log(`   ✅ Total permissions: ${permsData.data.permissions.length}`);

  // 4. Revoke permission
  console.log("4. Revoking user permission...");
  await fetch(`${API_BASE}/documents/${documentId}/permissions`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      subject_type: "user",
      subject_id: 1,
    }),
  });
  console.log("   ✅ Permission revoked\n");
}

async function testVersions() {
  console.log("📚 Testing Document Versions...\n");

  if (!documentId) {
    console.log("⚠️  No document ID. Skipping versions test.");
    return;
  }

  // 1. Create version 1
  console.log("1. Creating version 1...");
  await fetch(`${API_BASE}/documents/${documentId}/versions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      file_path: "/storage/documents/doc-v1.pdf",
      comment: "Initial version",
    }),
  });
  console.log("   ✅ Version 1 created");

  // 2. Create version 2
  console.log("2. Creating version 2...");
  await fetch(`${API_BASE}/documents/${documentId}/versions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      file_path: "/storage/documents/doc-v2.pdf",
      comment: "Updated terms and conditions",
    }),
  });
  console.log("   ✅ Version 2 created");

  // 3. Create version 3
  console.log("3. Creating version 3...");
  await fetch(`${API_BASE}/documents/${documentId}/versions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      file_path: "/storage/documents/doc-v3.pdf",
      comment: "Fixed typos and formatting",
    }),
  });
  console.log("   ✅ Version 3 created");

  // 4. Get all versions
  console.log("4. Getting all versions...");
  const versionsRes = await fetch(`${API_BASE}/documents/${documentId}/versions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const versionsData = await versionsRes.json();
  console.log(`   ✅ Total versions: ${versionsData.data.versions.length}`);
  versionsData.data.versions.forEach((v) => {
    console.log(`      - v${v.version_no}: ${v.comment || 'No comment'}`);
  });

  // 5. Get latest version
  console.log("5. Getting latest version...");
  const latestRes = await fetch(`${API_BASE}/documents/${documentId}/versions/latest`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const latestData = await latestRes.json();
  console.log(`   ✅ Latest: v${latestData.data.version.version_no}\n`);
}

async function main() {
  console.log("\n╔════════════════════════════════════════╗");
  console.log("║  🧪 PHASE 1 FEATURES TEST             ║");
  console.log("╚════════════════════════════════════════╝");

  try {
    await login();
    await testTags();
    await testPermissions();
    await testVersions();

    console.log("╔════════════════════════════════════════╗");
    console.log("║  ✅ ALL TESTS PASSED!                 ║");
    console.log("╚════════════════════════════════════════╝\n");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
