/**
 * Script test các chức năng cơ bản của WP Sign
 * Chạy: npx ts-node scripts/test-basic-flow.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const API_BASE = process.env.API_BASE || "http://localhost:4000/api/v1";

interface TestContext {
  accessToken: string;
  tenantId: number;
  userId: number;
  documentId?: number;
  signRequestId?: number;
  signerId?: number;
  otp?: string;
}

const ctx: TestContext = {
  accessToken: "",
  tenantId: 0,
  userId: 0,
};

async function makeRequest(
  method: string,
  path: string,
  body?: unknown,
  useAuth = true,
): Promise<{ status: number; data: unknown }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (useAuth && ctx.accessToken) {
    headers["Authorization"] = `Bearer ${ctx.accessToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  return { status: response.status, data };
}

async function test1_Login() {
  console.log("\n🔐 Test 1: Login");
  console.log("================");

  const result = await makeRequest(
    "POST",
    "/auth/login",
    {
      email: "admin@tenant1.com",
      password: "password123",
    },
    false,
  );

  if (result.status === 200) {
    const data = result.data as {
      tokens: { accessToken: string };
      user: { id: number };
      tenant: { id: number };
    };
    ctx.accessToken = data.tokens.accessToken;
    ctx.userId = data.user.id;
    ctx.tenantId = data.tenant.id;
    console.log("✅ Login thành công");
    console.log(`   User ID: ${ctx.userId}`);
    console.log(`   Tenant ID: ${ctx.tenantId}`);
  } else {
    console.error("❌ Login thất bại:", result.data);
    process.exit(1);
  }
}

async function test2_UploadDocument() {
  console.log("\n📄 Test 2: Upload Document");
  console.log("===========================");

  // Create a simple base64 PDF (minimal valid PDF)
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test Document) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000317 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
410
%%EOF`;

  const base64Pdf = Buffer.from(pdfContent).toString("base64");

  const result = await makeRequest("POST", "/documents", {
    fileName: "test-contract.pdf",
    base64: base64Pdf,
  });

  if (result.status === 201) {
    const data = result.data as { id: number; file_path: string };
    ctx.documentId = data.id;
    console.log("✅ Upload document thành công");
    console.log(`   Document ID: ${ctx.documentId}`);
    console.log(`   File path: ${data.file_path}`);
  } else {
    console.error("❌ Upload document thất bại:", result.data);
    process.exit(1);
  }
}

async function test3_ListDocuments() {
  console.log("\n📋 Test 3: List Documents");
  console.log("==========================");

  const result = await makeRequest("GET", "/documents");

  if (result.status === 200) {
    const data = result.data as Array<{ id: number; file_path: string; status: string }>;
    console.log(`✅ Lấy danh sách documents thành công (${data.length} documents)`);
    data.forEach((doc) => {
      console.log(`   - ID: ${doc.id}, Status: ${doc.status}`);
    });
  } else {
    console.error("❌ List documents thất bại:", result.data);
  }
}

async function test4_CreateSignRequest() {
  console.log("\n✍️  Test 4: Create Sign Request");
  console.log("================================");

  if (!ctx.documentId) {
    console.error("❌ Không có document ID");
    return;
  }

  const result = await makeRequest("POST", "/sign-requests", {
    document_id: ctx.documentId,
    title: "Hợp đồng test",
    message: "Vui lòng ký tài liệu này",
    workflow_type: "sequential",
    signers: [
      {
        email: "signer1@example.com",
        name: "Người ký 1",
        role: "signer",
      },
      {
        email: "signer2@example.com",
        name: "Người ký 2",
        role: "approver",
      },
    ],
  });

  if (result.status === 201) {
    const data = result.data as {
      id: number;
      status: string;
      signers: Array<{ id: number; email: string; status: string }>;
    };
    ctx.signRequestId = data.id;
    ctx.signerId = data.signers[0]?.id;
    console.log("✅ Tạo sign request thành công");
    console.log(`   Sign Request ID: ${ctx.signRequestId}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Signers: ${data.signers.length}`);
    data.signers.forEach((signer) => {
      console.log(`   - ${signer.email} (${signer.status})`);
    });
  } else {
    console.error("❌ Tạo sign request thất bại:", result.data);
    process.exit(1);
  }
}

async function test5_SendOTP() {
  console.log("\n📧 Test 5: Send OTP");
  console.log("====================");

  if (!ctx.signerId) {
    console.error("❌ Không có signer ID");
    return;
  }

  const result = await makeRequest("POST", `/signers/${ctx.signerId}/send-otp`);

  if (result.status === 200) {
    const data = result.data as { otp: string; message: string };
    ctx.otp = data.otp;
    console.log("✅ Gửi OTP thành công");
    console.log(`   OTP: ${ctx.otp}`);
    console.log(`   Message: ${data.message}`);
    console.log("   📧 Kiểm tra email hoặc console log để xem OTP");
  } else {
    console.error("❌ Gửi OTP thất bại:", result.data);
  }
}

async function test6_SignDocument() {
  console.log("\n✅ Test 6: Sign Document");
  console.log("=========================");

  if (!ctx.signerId || !ctx.otp) {
    console.error("❌ Không có signer ID hoặc OTP");
    return;
  }

  const result = await makeRequest("POST", `/signers/${ctx.signerId}/sign`, {
    otp: ctx.otp,
    signature_data: {
      x: 100,
      y: 200,
      width: 150,
      height: 50,
      page: 1,
    },
  });

  if (result.status === 200) {
    console.log("✅ Ký tài liệu thành công");
    console.log("   Signature đã được lưu");
  } else {
    console.error("❌ Ký tài liệu thất bại:", result.data);
  }
}

async function test7_GetSignRequest() {
  console.log("\n📊 Test 7: Get Sign Request Status");
  console.log("====================================");

  if (!ctx.signRequestId) {
    console.error("❌ Không có sign request ID");
    return;
  }

  const result = await makeRequest("GET", `/sign-requests/${ctx.signRequestId}`);

  if (result.status === 200) {
    const data = result.data as {
      id: number;
      status: string;
      signers: Array<{ email: string; status: string; signed_at: string | null }>;
    };
    console.log("✅ Lấy thông tin sign request thành công");
    console.log(`   Status: ${data.status}`);
    console.log("   Signers:");
    data.signers.forEach((signer) => {
      console.log(`   - ${signer.email}: ${signer.status} ${signer.signed_at ? `(signed at ${signer.signed_at})` : ""}`);
    });
  } else {
    console.error("❌ Lấy sign request thất bại:", result.data);
  }
}

async function test8_GetAuditLogs() {
  console.log("\n📜 Test 8: Get Audit Logs");
  console.log("==========================");

  if (!ctx.documentId) {
    console.error("❌ Không có document ID");
    return;
  }

  const result = await makeRequest("GET", `/audit/${ctx.documentId}`);

  if (result.status === 200) {
    const data = result.data as Array<{ event: string; created_at: string; ip: string | null }>;
    console.log(`✅ Lấy audit logs thành công (${data.length} events)`);
    data.forEach((log) => {
      console.log(`   - ${log.event} at ${log.created_at} ${log.ip ? `from ${log.ip}` : ""}`);
    });
  } else {
    console.error("❌ Lấy audit logs thất bại:", result.data);
  }
}

async function runTests() {
  console.log("🚀 Bắt đầu test các chức năng cơ bản của WP Sign");
  console.log("=================================================");
  console.log(`API Base: ${API_BASE}`);

  try {
    await test1_Login();
    await test2_UploadDocument();
    await test3_ListDocuments();
    await test4_CreateSignRequest();
    await test5_SendOTP();

    // Wait a bit before signing
    console.log("\n⏳ Đợi 2 giây trước khi ký...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await test6_SignDocument();
    await test7_GetSignRequest();
    await test8_GetAuditLogs();

    console.log("\n🎉 Hoàn thành tất cả tests!");
    console.log("============================");
  } catch (error) {
    console.error("\n💥 Lỗi khi chạy tests:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
runTests();
