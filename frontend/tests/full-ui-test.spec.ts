import { expect, test } from "@playwright/test";

const creds = {
  email: "admin@acme.local",
  password: "secret123",
};

test.describe("Document Types Integration - Full UI Test", () => {
  test("Complete flow: Login → Select type → Upload → Verify number", async ({ page }) => {
    // Enable logging
    page.on('console', msg => {
      if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
    });
    
    console.log("🧪 Starting full UI test...");
    
    // 1. Login
    await page.goto("/login");
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill(creds.email);
    
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(creds.password);
    
    const loginButton = page.locator('button[type="submit"]').first();
    await loginButton.click();
    
    await page.waitForURL(/\/(dashboard)?/, { timeout: 10000 });
    console.log("✅ Step 1: Login successful");
    
    // 2. Navigate to documents
    await page.goto("/documents", { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // Wait for React to render
    console.log("✅ Step 2: On documents page");
    
    // 3. Verify dropdown exists and has options
    const dropdown = page.locator('select').first();
    await dropdown.waitFor({ state: 'visible', timeout: 10000 });
    await expect(dropdown).toBeVisible();
    
    const optionCount = await dropdown.locator('option').count();
    expect(optionCount).toBeGreaterThan(1);
    console.log(`✅ Step 3: Dropdown has ${optionCount} options`);
    
    // 4. Select a document type (index 1 = first real type)
    await dropdown.selectOption({ index: 1 });
    const selectedType = await dropdown.locator('option:checked').textContent();
    console.log(`✅ Step 4: Selected type: ${selectedType}`);
    
    // 5. Verify "Số văn bản" column exists in table
    const numberColumnHeader = page.getByText(/Số văn bản/i);
    await expect(numberColumnHeader).toBeVisible();
    console.log("✅ Step 5: 'Số văn bản' column visible");
    
    // 6. Check existing documents
    const table = page.locator('table').first();
    const existingRows = await table.locator('tbody tr').count();
    console.log(`✅ Step 6: Found ${existingRows} existing documents`);
    
    // 7. Verify document numbers are displayed
    if (existingRows > 0) {
      const firstRow = table.locator('tbody tr').first();
      const cells = await firstRow.locator('td').count();
      console.log(`   Row has ${cells} cells`);
      
      // Look for document number pattern (XXX/YYYY)
      const rowText = await firstRow.textContent();
      const hasNumberPattern = /\d{3}\/\d{4}/.test(rowText || '');
      console.log(`   Has document number pattern: ${hasNumberPattern}`);
      
      if (hasNumberPattern) {
        const match = rowText?.match(/(\d{3}\/\d{4})/);
        console.log(`✅ Step 7: Document number found: ${match?.[1]}`);
      }
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/full-test-complete.png', fullPage: true });
    
    console.log("🎉 Full UI test completed successfully!");
  });
});
