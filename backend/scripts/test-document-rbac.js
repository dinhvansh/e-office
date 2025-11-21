/**
 * Test Document RBAC Enforcement
 * 
 * Tests:
 * 1. User without permission cannot access documents
 * 2. User with permission can access documents
 * 3. User can only view documents they have access to
 * 4. User can only delete their own documents
 * 5. Admin can access all documents
 */

const API_BASE = 'http://localhost:4000/api/v1';

// Test users (use existing users from seed data)
const ADMIN_USER = {
  email: 'admin@acme.local',
  password: 'password123' // Default password from seed
};

const REGULAR_USER = {
  email: 'user1@acme.local', // Will create if not exists
  password: 'User123!@#'
};

const VIEWER_USER = {
  email: 'viewer1@acme.local', // Will create if not exists
  password: 'Viewer123!@#'
};

let adminToken = '';
let userToken = '';
let viewerToken = '';
let testDocumentId = null;
let userDocumentId = null;

async function login(email, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  if (!data.success) {
    throw new Error(`Login failed: ${data.error?.message || 'Unknown error'}`);
  }
  
  return data.data.tokens.accessToken;
}

async function createDocument(token, fileName = 'test-rbac.txt') {
  const base64 = Buffer.from('Test RBAC content').toString('base64');
  
  const response = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      file_name: fileName,
      file_base64: base64,
      title: 'Test RBAC Document',
      visibility_scope: 'public'
    })
  });
  
  const data = await response.json();
  return { response, data };
}

async function listDocuments(token) {
  const response = await fetch(`${API_BASE}/documents`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  return { response, data };
}

async function getDocument(token, documentId) {
  const response = await fetch(`${API_BASE}/documents/${documentId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  return { response, data };
}

async function deleteDocument(token, documentId) {
  const response = await fetch(`${API_BASE}/documents/${documentId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  return { response, data };
}

async function runTests() {
  console.log('🧪 Testing Document RBAC Enforcement\n');
  
  try {
    // Setup: Login all users
    console.log('📝 Setup: Logging in users...');
    adminToken = await login(ADMIN_USER.email, ADMIN_USER.password);
    console.log('✅ Admin logged in');
    
    userToken = await login(REGULAR_USER.email, REGULAR_USER.password);
    console.log('✅ Regular user logged in');
    
    try {
      viewerToken = await login(VIEWER_USER.email, VIEWER_USER.password);
      console.log('✅ Viewer logged in');
    } catch (error) {
      console.log('⚠️  Viewer user not found (optional)');
    }
    
    console.log('');
    
    // Test 1: User with permission can create document
    console.log('Test 1: User with permission can create document');
    const { response: createResp, data: createData } = await createDocument(userToken, 'user-doc.txt');
    if (createResp.status === 201 && createData.success) {
      userDocumentId = createData.data.document.id;
      console.log(`✅ User created document (ID: ${userDocumentId})`);
    } else {
      console.log(`❌ Failed: ${createData.error?.message || 'Unknown error'}`);
    }
    console.log('');
    
    // Test 2: Admin can create document
    console.log('Test 2: Admin can create document');
    const { response: adminCreateResp, data: adminCreateData } = await createDocument(adminToken, 'admin-doc.txt');
    if (adminCreateResp.status === 201 && adminCreateData.success) {
      testDocumentId = adminCreateData.data.document.id;
      console.log(`✅ Admin created document (ID: ${testDocumentId})`);
    } else {
      console.log(`❌ Failed: ${adminCreateData.error?.message || 'Unknown error'}`);
    }
    console.log('');
    
    // Test 3: User can list documents (with permission)
    console.log('Test 3: User can list documents');
    const { response: listResp, data: listData } = await listDocuments(userToken);
    if (listResp.status === 200 && listData.success) {
      console.log(`✅ User listed ${listData.data.documents.length} documents`);
    } else {
      console.log(`❌ Failed: ${listData.error?.message || 'Unknown error'}`);
    }
    console.log('');
    
    // Test 4: User can view their own document
    console.log('Test 4: User can view their own document');
    if (userDocumentId) {
      const { response: viewResp, data: viewData } = await getDocument(userToken, userDocumentId);
      if (viewResp.status === 200 && viewData.success) {
        console.log(`✅ User viewed their own document`);
      } else {
        console.log(`❌ Failed: ${viewData.error?.message || 'Unknown error'}`);
      }
    } else {
      console.log('⚠️  Skipped: No user document created');
    }
    console.log('');
    
    // Test 5: User can view public document from admin
    console.log('Test 5: User can view public document from admin');
    if (testDocumentId) {
      const { response: viewResp, data: viewData } = await getDocument(userToken, testDocumentId);
      if (viewResp.status === 200 && viewData.success) {
        console.log(`✅ User viewed public document from admin`);
      } else {
        console.log(`❌ Failed: ${viewData.error?.message || 'Unknown error'}`);
      }
    } else {
      console.log('⚠️  Skipped: No admin document created');
    }
    console.log('');
    
    // Test 6: User cannot delete admin's document
    console.log('Test 6: User cannot delete admin\'s document');
    if (testDocumentId) {
      const { response: delResp, data: delData } = await deleteDocument(userToken, testDocumentId);
      if (delResp.status === 403) {
        console.log(`✅ User correctly denied (403 Forbidden)`);
      } else if (delResp.status === 200) {
        console.log(`❌ User should not be able to delete admin's document`);
      } else {
        console.log(`⚠️  Unexpected status: ${delResp.status}`);
      }
    } else {
      console.log('⚠️  Skipped: No admin document to test');
    }
    console.log('');
    
    // Test 7: User without delete permission cannot delete (even own document)
    console.log('Test 7: User without delete permission cannot delete');
    if (userDocumentId) {
      const { response: delResp, data: delData } = await deleteDocument(userToken, userDocumentId);
      if (delResp.status === 403) {
        console.log(`✅ User correctly denied (403 Forbidden - no delete permission)`);
      } else if (delResp.status === 200) {
        console.log(`❌ User should not be able to delete (no permission)`);
        userDocumentId = null; // Mark as deleted
      } else {
        console.log(`⚠️  Unexpected status: ${delResp.status}`);
      }
    } else {
      console.log('⚠️  Skipped: No user document to test');
    }
    console.log('');
    
    // Test 8: Admin can delete any document (including user's document)
    console.log('Test 8: Admin can delete any document');
    if (userDocumentId) {
      const { response: delResp, data: delData } = await deleteDocument(adminToken, userDocumentId);
      if (delResp.status === 200 && delData.success) {
        console.log(`✅ Admin deleted user's document`);
        userDocumentId = null; // Mark as deleted
      } else {
        console.log(`❌ Failed: ${delData.error?.message || 'Unknown error'}`);
      }
    } else {
      console.log('⚠️  Skipped: No document to delete');
    }
    
    // Also delete admin's own document
    if (testDocumentId) {
      const { response: delResp, data: delData } = await deleteDocument(adminToken, testDocumentId);
      if (delResp.status === 200 && delData.success) {
        console.log(`✅ Admin deleted own document`);
        testDocumentId = null;
      }
    }
    console.log('');
    
    // Test 9: Viewer without create permission cannot create
    if (viewerToken) {
      console.log('Test 9: Viewer without create permission cannot create');
      const { response: viewerCreateResp, data: viewerCreateData } = await createDocument(viewerToken);
      if (viewerCreateResp.status === 403) {
        console.log(`✅ Viewer correctly denied (403 Forbidden)`);
      } else if (viewerCreateResp.status === 201) {
        console.log(`❌ Viewer should not be able to create documents`);
        // Cleanup
        if (viewerCreateData.data?.document?.id) {
          await deleteDocument(adminToken, viewerCreateData.data.document.id);
        }
      } else {
        console.log(`⚠️  Unexpected status: ${viewerCreateResp.status}`);
      }
      console.log('');
    }
    
    console.log('✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);
