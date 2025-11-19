import { test } from '@playwright/test';

test('Clear localStorage to fix invalid token', async ({ page }) => {
  console.log('\n🧹 Clearing localStorage and sessionStorage...\n');
  
  // Go to app
  await page.goto('http://localhost:3000');
  
  // Show current storage
  const before = await page.evaluate(() => {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) data[key] = localStorage.getItem(key) || '';
    }
    return data;
  });
  
  console.log('📦 Storage before clear:');
  console.log(JSON.stringify(before, null, 2));
  
  // Clear all storage
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  console.log('\n✅ Storage cleared successfully!\n');
  
  // Verify it's empty
  const after = await page.evaluate(() => localStorage.length);
  console.log(`📊 localStorage items: ${after}`);
  
  console.log('\n📝 Next steps:');
  console.log('1. Go to http://localhost:3000');
  console.log('2. Login with:');
  console.log('   Email: admin@acme.local');
  console.log('   Password: secret123');
  console.log('\n✨ Done!\n');
});
