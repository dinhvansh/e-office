const fetch = require('node-fetch');

async function testAPI() {
  try {
    // First login to get token
    console.log('🔐 Logging in...');
    const loginResponse = await fetch('http://localhost:4000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@acme.local',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error('Login error:', errorText);
      throw new Error('Login failed');
    }

    const loginData = await loginResponse.json();
    const token = loginData.data.tokens.accessToken;
    console.log('✅ Login successful');

    // Fetch sign request details
    console.log('\n📋 Fetching sign request 43...');
    const response = await fetch('http://localhost:4000/api/v1/sign-requests/43', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    console.log('\n✅ API Response:');
    console.log(JSON.stringify(data, null, 2));

    // Check if fields are included
    console.log('\n📝 FIELDS CHECK:');
    if (data.data.sign_request.fields) {
      console.log(`✅ Fields found: ${data.data.sign_request.fields.length}`);
      data.data.sign_request.fields.forEach((field, idx) => {
        console.log(`\n${idx + 1}. Field ID: ${field.id}`);
        console.log(`   Type: ${field.type}`);
        console.log(`   Page: ${field.page}`);
        console.log(`   Position: (${field.x}, ${field.y})`);
        console.log(`   Size: ${field.width}x${field.height}`);
        console.log(`   Assigned to: ${field.assigned_signer_id}`);
      });
    } else {
      console.log('❌ No fields in response!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();
