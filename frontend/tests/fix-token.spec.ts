import { test, expect } from '@playwright/test';

test.describe('Fix Invalid Token', () => {
  test('Clear storage and login with correct credentials', async ({ page }) => {
    console.log('🧹 Clearing localStorage...');
    
    // Go to app
    await page.goto('http://localhost:3000');
    
    // Clear all storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    console.log('✅ Storage cleared');
    
    // Reload to trigger login page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    console.log('🔐 Attempting login...');
    
    // Fill login form
    await page.fill('input[type="email"]', 'admin@acme.local');
    await page.fill('input[type="password"]', 'secret123');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for redirect (login redirects to "/" which is dashboard)
    await page.waitForURL('**/', { timeout: 10000 });
    
    console.log('✅ Login successful!');
    
    // Verify we're logged in (should be on home/dashboard)
    await expect(page).toHaveURL(/.*localhost:3000\/?$/);
    
    // Check if we can see dashboard content
    const hasContent = await page.locator('body').textContent();
    expect(hasContent).toBeTruthy();
    
    console.log('✅ Dashboard loaded successfully');
    
    // Try to fetch documents to verify token works
    await page.goto('http://localhost:3000/documents');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Documents page accessible');
    
    // Check for no error messages
    const errorText = await page.locator('body').textContent();
    expect(errorText).not.toContain('Invalid token');
    expect(errorText).not.toContain('Unauthorized');
    
    console.log('✅ No token errors - Fix complete!');
  });
});
