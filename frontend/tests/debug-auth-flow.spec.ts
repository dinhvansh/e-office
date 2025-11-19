import { test, expect } from '@playwright/test';

test('Debug auth flow - check localStorage', async ({ page }) => {
  console.log('\n🔍 Debugging auth flow...\n');
  
  // Clear storage first
  await page.goto('http://localhost:3000');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  console.log('✅ Storage cleared');
  
  // Reload to go to login
  await page.reload();
  await page.waitForLoadState('networkidle');
  
  // Fill login form
  console.log('📝 Filling login form...');
  await page.fill('input[type="email"]', 'admin@acme.local');
  await page.fill('input[type="password"]', 'secret123');
  
  // Submit
  console.log('🔐 Submitting login...');
  await page.click('button[type="submit"]');
  
  // Wait a bit for login to process
  await page.waitForTimeout(2000);
  
  // Check localStorage
  const storage = await page.evaluate(() => {
    const auth = localStorage.getItem('esign.auth');
    return auth;
  });
  
  console.log('\n📦 localStorage after login:');
  console.log(storage);
  
  if (storage) {
    const parsed = JSON.parse(storage);
    console.log('\n✅ Auth data found:');
    console.log('  - Has tokens:', !!parsed.tokens);
    console.log('  - Has accessToken:', !!parsed.tokens?.accessToken);
    console.log('  - Has refreshToken:', !!parsed.tokens?.refreshToken);
    console.log('  - Has user:', !!parsed.user);
    console.log('  - User email:', parsed.user?.email);
    
    if (parsed.tokens?.accessToken) {
      console.log('  - Token preview:', parsed.tokens.accessToken.substring(0, 30) + '...');
    }
  } else {
    console.log('\n❌ No auth data in localStorage!');
  }
  
  // Check current URL
  const url = page.url();
  console.log('\n📍 Current URL:', url);
  
  // Try to navigate to documents
  console.log('\n🧪 Navigating to /documents...');
  await page.goto('http://localhost:3000/documents');
  await page.waitForTimeout(1000);
  
  // Check for errors
  const bodyText = await page.locator('body').textContent();
  if (bodyText?.includes('Invalid token') || bodyText?.includes('Unauthorized')) {
    console.log('\n❌ ERROR: Invalid token error found on page!');
  } else {
    console.log('\n✅ No token errors on documents page');
  }
  
  console.log('\n');
});
