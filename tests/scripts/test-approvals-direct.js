const API_URL = 'http://localhost:4000/api/v1';

async function main() {
  console.log('🧪 Testing Approvals API directly...\n');

  // Login first
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@acme.local',
      password: 'admin123',
    }),
  });

  const loginData = await loginRes.json();
  const token = loginData.data.tokens.accessToken;
  console.log('✅ Login successful');

  // Test approvals API
  console.log('\n📋 Testing GET /api/v1/approvals...');
  
  try {
    const approvalsRes = await fetch(`${API_URL}/approvals`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });

    console.log('Status:', approvalsRes.status);
    console.log('Headers:', Object.fromEntries(approvalsRes.headers.entries()));
    
    const responseText = await approvalsRes.text();
    console.log('Response body:', responseText);
    
    if (approvalsRes.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ Success! Data:', data);
    } else {
      console.log('❌ Failed with status:', approvalsRes.status);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

main().catch(console.error);