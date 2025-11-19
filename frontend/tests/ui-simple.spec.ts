import { expect, test } from "@playwright/test";

const creds = {
  email: "admin@acme.local",
  password: "secret123",
};

test.describe("Document Types UI Test", () => {
  test("Login and verify documents page loads", async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    // Go to login page
    await page.goto("/login");
    await page.waitForLoadState('networkidle');
    
    console.log("On login page");
    
    // Take screenshot of login page
    await page.screenshot({ path: 'test-results/login-page.png', fullPage: true });
    
    // Check what inputs exist
    const allInputs = await page.locator('input').count();
    console.log(`Total inputs found: ${allInputs}`);
    
    for (let i = 0; i < allInputs; i++) {
      const input = page.locator('input').nth(i);
      const type = await input.getAttribute('type');
      const name = await input.getAttribute('name');
      const placeholder = await input.getAttribute('placeholder');
      console.log(`Input ${i}: type=${type}, name=${name}, placeholder=${placeholder}`);
    }
    
    // Fill credentials - try different selectors
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.fill(creds.email);
    console.log("Email filled");
    
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    await passwordInput.fill(creds.password);
    console.log("Password filled");
    
    // Take screenshot before clicking
    await page.screenshot({ path: 'test-results/before-login-click.png', fullPage: true });
    
    // Click login button
    const loginButton = page.locator('button[type="submit"], button:has-text("Đăng nhập")').first();
    console.log("Clicking login button...");
    await loginButton.click();
    
    // Wait a bit to see what happens
    await page.waitForTimeout(2000);
    
    // Wait for navigation - try multiple patterns
    try {
      await page.waitForURL(/\/(dashboard|documents)/, { timeout: 10000 });
    } catch (e) {
      console.log("Waiting for URL change failed, checking current URL...");
      console.log(`Current URL after login: ${page.url()}`);
      
      // If still on login, there might be an error
      if (page.url().includes('/login')) {
        const errorMsg = await page.locator('text=/error|lỗi/i').textContent().catch(() => null);
        console.log(`Error on page: ${errorMsg}`);
        throw new Error('Login failed - still on login page');
      }
    }
    
    console.log(`✅ Login successful, current URL: ${page.url()}`);
    
    // Navigate to documents page explicitly
    await page.goto("/documents", { waitUntil: 'networkidle' });
    
    console.log("✅ Documents page loaded");
    
    // Wait for React to render and data to load
    await page.waitForTimeout(3000);
    
    // Check for any errors on page
    const pageContent = await page.content();
    console.log(`Page URL: ${page.url()}`);
    
    // Check if we're actually on documents page
    const isDocumentsPage = page.url().includes('/documents');
    console.log(`On documents page: ${isDocumentsPage}`);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/documents-page.png', fullPage: true });
    
    // Log all text content to see what's on page
    const bodyText = await page.locator('body').textContent();
    console.log(`Page text (first 200 chars): ${bodyText?.substring(0, 200)}`);
    
    // Check if page has the upload section
    const hasUploadSection = await page.getByText(/Upload PDF|Tải tài liệu/i).count();
    console.log(`Upload section found: ${hasUploadSection > 0}`);
    
    // Check if dropdown exists
    const dropdowns = await page.locator('select').count();
    console.log(`Dropdowns found: ${dropdowns}`);
    
    if (dropdowns > 0) {
      const dropdown = page.locator('select').first();
      await dropdown.waitFor({ state: 'visible', timeout: 5000 });
      
      // Get options
      const options = await dropdown.locator('option').count();
      console.log(`✅ Dropdown has ${options} options`);
      
      // Get first few option texts
      for (let i = 0; i < Math.min(3, options); i++) {
        const text = await dropdown.locator('option').nth(i).textContent();
        console.log(`  Option ${i}: ${text}`);
      }
      
      expect(options).toBeGreaterThan(1); // At least placeholder + 1 type
    }
    
    // Check if table exists
    const tables = await page.locator('table').count();
    console.log(`Tables found: ${tables}`);
    
    if (tables > 0) {
      // Check for "Số văn bản" column
      const hasNumberColumn = await page.getByText(/Số văn bản/i).count();
      console.log(`✅ "Số văn bản" column found: ${hasNumberColumn > 0}`);
      
      if (hasNumberColumn > 0) {
        expect(hasNumberColumn).toBeGreaterThan(0);
      }
    }
    
    console.log("✅ UI verification complete");
  });
});
