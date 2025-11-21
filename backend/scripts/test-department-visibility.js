/**
 * Test Department-Based Document Visibility
 * 
 * Tests:
 * 1. User can see documents from their own department
 * 2. User cannot see documents from other departments
 * 3. Admin can see all documents regardless of department
 * 4. Owner can see their own document regardless of department
 * 5. Public documents visible to all
 * 6. Private documents only visible to owner + admin
 */

const API_BASE = 'http://localhost:4000/api/v1';

let adminToken = '';
let dept1UserToken = '';
let dept2UserToken = '';

let dept1Id = null;
let dept2Id = null;

let dept1DocId = null;
let dept2DocId = null;
let publicDocId = null;
let privateDocId = null;

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

async function createDepartment(token, name, code) {
  const response = await fetch(`${API_BASE}/departments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ name, code })
  });
  
  const data = await response.json();
  if (!data.success) {
    console.error('Failed to create department:', data.error);
    throw new Error(`Department creation failed: ${data.error?.message || 'Unknown error'}`);
  }
  return data.data.id;
}

async function createUser(token, email, password, fullName, departmentId) {
  const response = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      email,
      password,
      full_name: fullName,
      department_id: departmentId
    })
  });
  
  const data = await response.json();
  return { response, data };
}

async function assignRole(token, userId, roleId) {
  const response = await fetch(`${API_BASE}/users/${userId}/roles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ role_id: roleId })
  });
  
  return response.json();
}

async function createDocument(token, fileName, title, visibilityScope, departmentId = null) {
  const base64 = Buffer.from(`Test content for ${title}`).toString('base64');
  
  const body = {
    file_name: fileName,
    file_base64: base64,
    title: title,
    visibility_scope: visibilityScope
  };
  
  if (departmentId) {
    body.department_id = departmentId;
  }
  
  const response = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
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

async function runTests() {
  console.log('🧪 Testing Department-Based Document Visibility\n');
  
  try {
    // Setup: Login admin
    console.log('📝 Setup: Creating test environment...');
    adminToken = await login('admin@acme.local', 'password123');
    console.log('✅ Admin logged in');
    
    // Create two departments with unique codes
    const timestamp = Date.now();
    try {
      dept1Id = await createDepartment(adminToken, 'Test Department 1', `TEST_DEPT_1_${timestamp}`);
      dept2Id = await createDepartment(adminToken, 'Test Department 2', `TEST_DEPT_2_${timestamp}`);
      console.log(`✅ Created departments (Dept1: ${dept1Id}, Dept2: ${dept2Id})`);
    } catch (error) {
      console.error('Failed to create departments:', error.message);
      throw error;
    }
    
    // Use existing test users and update their departments
    const user1Email = 'user1@acme.local';
    const user2Email = 'viewer1@acme.local';
    
    // Update user1 to dept1 (ID: 18)
    const update1Resp = await fetch(`${API_BASE}/users/18`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ department_id: dept1Id })
    });
    const update1Data = await update1Resp.json();
    if (!update1Data.success) {
      console.error('Failed to update user1:', update1Data);
      throw new Error('User update failed');
    }
    
    // Update viewer1 to dept2 (ID: 19)
    const update2Resp = await fetch(`${API_BASE}/users/19`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ department_id: dept2Id })
    });
    const update2Data = await update2Resp.json();
    if (!update2Data.success) {
      console.error('Failed to update viewer1:', update2Data);
      throw new Error('User update failed');
    }
    
    console.log('✅ Updated test users to departments');
    
    // Login as department users
    dept1UserToken = await login(user1Email, 'User123!@#');
    dept2UserToken = await login(user2Email, 'Viewer123!@#');
    console.log('✅ Test users logged in\n');
    
    // Create test documents
    console.log('📝 Creating test documents...');
    
    // Document 1: Department 1 visibility
    const { data: doc1 } = await createDocument(
      dept1UserToken,
      'dept1-doc.txt',
      'Department 1 Document',
      'department',
      dept1Id
    );
    if (!doc1.success) {
      console.error('Failed to create doc1:', doc1);
      throw new Error('Document creation failed');
    }
    dept1DocId = doc1.data.document.id;
    console.log(`✅ Created Dept1 document (ID: ${dept1DocId})`);
    
    // Document 2: Department 2 visibility (create as admin, assign to dept2)
    const { data: doc2 } = await createDocument(
      adminToken,
      'dept2-doc.txt',
      'Department 2 Document',
      'department',
      dept2Id
    );
    dept2DocId = doc2.data.document.id;
    console.log(`✅ Created Dept2 document (ID: ${dept2DocId})`);
    
    // Document 3: Public visibility
    const { data: doc3 } = await createDocument(
      adminToken,
      'public-doc.txt',
      'Public Document',
      'public'
    );
    publicDocId = doc3.data.document.id;
    console.log(`✅ Created Public document (ID: ${publicDocId})`);
    
    // Document 4: Private visibility
    const { data: doc4 } = await createDocument(
      dept1UserToken,
      'private-doc.txt',
      'Private Document',
      'private'
    );
    privateDocId = doc4.data.document.id;
    console.log(`✅ Created Private document (ID: ${privateDocId})\n`);
    
    // Run tests
    console.log('🧪 Running visibility tests...\n');
    
    // Test 1: Dept1 user can see their own department document
    console.log('Test 1: User can see documents from their own department');
    const { response: test1Resp, data: test1Data } = await getDocument(dept1UserToken, dept1DocId);
    if (test1Resp.status === 200 && test1Data.success) {
      console.log('✅ Dept1 user can view Dept1 document');
    } else {
      console.log(`❌ Failed: ${test1Data.error?.message || 'Unknown error'}`);
    }
    console.log('');
    
    // Test 2: Dept1 user cannot see Dept2 document
    console.log('Test 2: User cannot see documents from other departments');
    const { response: test2Resp, data: test2Data } = await getDocument(dept1UserToken, dept2DocId);
    if (test2Resp.status === 403) {
      console.log('✅ Dept1 user correctly denied access to Dept2 document (403)');
    } else if (test2Resp.status === 200) {
      console.log('❌ Dept1 user should not see Dept2 document');
    } else {
      console.log(`⚠️  Unexpected status: ${test2Resp.status}`);
    }
    console.log('');
    
    // Test 3: Dept2 user can see their own department document
    console.log('Test 3: Dept2 user can see their own department document');
    const { response: test3Resp, data: test3Data } = await getDocument(dept2UserToken, dept2DocId);
    if (test3Resp.status === 200 && test3Data.success) {
      console.log('✅ Dept2 user can view Dept2 document');
    } else {
      console.log(`❌ Failed: ${test3Data.error?.message || 'Unknown error'}`);
    }
    console.log('');
    
    // Test 4: Dept2 user cannot see Dept1 document
    console.log('Test 4: Dept2 user cannot see Dept1 document');
    const { response: test4Resp, data: test4Data } = await getDocument(dept2UserToken, dept1DocId);
    if (test4Resp.status === 403) {
      console.log('✅ Dept2 user correctly denied access to Dept1 document (403)');
    } else if (test4Resp.status === 200) {
      console.log('❌ Dept2 user should not see Dept1 document');
    } else {
      console.log(`⚠️  Unexpected status: ${test4Resp.status}`);
    }
    console.log('');
    
    // Test 5: Admin can see all department documents
    console.log('Test 5: Admin can see all department documents');
    const { response: test5aResp, data: test5aData } = await getDocument(adminToken, dept1DocId);
    const { response: test5bResp, data: test5bData } = await getDocument(adminToken, dept2DocId);
    if (test5aResp.status === 200 && test5bResp.status === 200) {
      console.log('✅ Admin can view both Dept1 and Dept2 documents');
    } else {
      console.log('❌ Admin should be able to see all documents');
    }
    console.log('');
    
    // Test 6: All users can see public documents
    console.log('Test 6: All users can see public documents');
    const { response: test6aResp } = await getDocument(dept1UserToken, publicDocId);
    const { response: test6bResp } = await getDocument(dept2UserToken, publicDocId);
    if (test6aResp.status === 200 && test6bResp.status === 200) {
      console.log('✅ Both users can view public document');
    } else {
      console.log('❌ Public documents should be visible to all');
    }
    console.log('');
    
    // Test 7: Only owner can see private documents
    console.log('Test 7: Only owner can see private documents');
    const { response: test7aResp } = await getDocument(dept1UserToken, privateDocId);
    const { response: test7bResp } = await getDocument(dept2UserToken, privateDocId);
    if (test7aResp.status === 200 && test7bResp.status === 403) {
      console.log('✅ Owner can view, other user denied (403)');
    } else {
      console.log(`⚠️  Owner: ${test7aResp.status}, Other: ${test7bResp.status}`);
    }
    console.log('');
    
    // Test 8: List documents filters by department
    console.log('Test 8: List documents filters by department');
    const { data: list1Data } = await listDocuments(dept1UserToken);
    const { data: list2Data } = await listDocuments(dept2UserToken);
    
    const dept1Docs = list1Data.data.documents.filter(d => d.id === dept1DocId);
    const dept2DocsInList1 = list1Data.data.documents.filter(d => d.id === dept2DocId);
    const dept2Docs = list2Data.data.documents.filter(d => d.id === dept2DocId);
    const dept1DocsInList2 = list2Data.data.documents.filter(d => d.id === dept1DocId);
    
    if (dept1Docs.length > 0 && dept2DocsInList1.length === 0 && 
        dept2Docs.length > 0 && dept1DocsInList2.length === 0) {
      console.log('✅ List correctly filters by department');
    } else {
      console.log('⚠️  List filtering may not be working correctly');
    }
    console.log('');
    
    console.log('✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);
