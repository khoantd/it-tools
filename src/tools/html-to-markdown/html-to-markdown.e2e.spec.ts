import { test, expect } from '@playwright/test';

test.describe('Tool - HTML to Markdown Converter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/html-to-markdown');
  });

  test('Has correct title and meta information', async ({ page }) => {
    await expect(page).toHaveTitle('HTML to Markdown - IT Tools');
    
    // Check meta description
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content', 'Convert HTML content to Markdown format');
  });

  test('Converts basic HTML elements to Markdown', async ({ page }) => {
    const htmlInput = '<h1>Title</h1><p>This is <strong>bold</strong> and <em>italic</em> text.</p>';
    
    await page.fill('[data-testid="input"]', htmlInput);
    
    const output = page.locator('[data-testid="output"]');
    await expect(output).toContainText('# Title');
    await expect(output).toContainText('**bold**');
    await expect(output).toContainText('*italic*');
  });

  test('Converts lists correctly', async ({ page }) => {
    const htmlInput = `
      <ul>
        <li>First item</li>
        <li>Second item</li>
        <li>Third item</li>
      </ul>
    `;
    
    await page.fill('[data-testid="input"]', htmlInput);
    
    const output = page.locator('[data-testid="output"]');
    await expect(output).toContainText('- First item');
    await expect(output).toContainText('- Second item');
    await expect(output).toContainText('- Third item');
  });

  test('Converts links correctly', async ({ page }) => {
    const htmlInput = '<p>Visit <a href="https://example.com">Example</a> for more info.</p>';
    
    await page.fill('[data-testid="input"]', htmlInput);
    
    const output = page.locator('[data-testid="output"]');
    await expect(output).toContainText('[Example](https://example.com)');
  });

  test('Converts code blocks correctly', async ({ page }) => {
    const htmlInput = '<pre><code>console.log("Hello, World!");</code></pre>';
    
    await page.fill('[data-testid="input"]', htmlInput);
    
    const output = page.locator('[data-testid="output"]');
    await expect(output).toContainText('```');
    await expect(output).toContainText('console.log("Hello, World!");');
  });

  test('Converts tables correctly', async ({ page }) => {
    const htmlInput = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>John</td>
            <td>25</td>
          </tr>
          <tr>
            <td>Jane</td>
            <td>30</td>
          </tr>
        </tbody>
      </table>
    `;
    
    await page.fill('[data-testid="input"]', htmlInput);
    
    const output = page.locator('[data-testid="output"]');
    await expect(output).toContainText('| Name | Age |');
    await expect(output).toContainText('| John | 25 |');
    await expect(output).toContainText('| Jane | 30 |');
  });

  test('Shows validation error for invalid HTML', async ({ page }) => {
    const invalidHtml = '<div>Unclosed tag<p>Another unclosed';
    
    await page.fill('[data-testid="input"]', invalidHtml);
    
    // Should show validation error
    await expect(page.locator('.validation-message')).toBeVisible();
    await expect(page.locator('.validation-message')).toContainText('not valid');
  });

  test('Handles empty input gracefully', async ({ page }) => {
    await page.fill('[data-testid="input"]', '');
    
    const output = page.locator('[data-testid="output"]');
    await expect(output).toHaveValue('');
  });

  test('Shows HTML complexity analysis', async ({ page }) => {
    const complexHtml = `
      <div>
        <h1>Title</h1>
        <p>Content</p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
        <table>
          <tr><td>Data</td></tr>
        </table>
      </div>
    `;
    
    await page.fill('[data-testid="input"]', complexHtml);
    
    // Should show complexity info
    await expect(page.locator('.complexity-info')).toBeVisible();
    await expect(page.locator('.complexity-info')).toContainText('HTML Analysis');
  });

  test('Copy button works correctly', async ({ page }) => {
    const htmlInput = '<h1>Test Title</h1>';
    
    await page.fill('[data-testid="input"]', htmlInput);
    
    // Click copy button
    await page.click('text=Copy Markdown');
    
    // Check if clipboard contains the markdown
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('# Test Title');
  });

  test('Clear All button works', async ({ page }) => {
    const htmlInput = '<h1>Test Content</h1>';
    
    await page.fill('[data-testid="input"]', htmlInput);
    await page.click('text=Clear All');
    
    // Check if input is cleared
    await expect(page.locator('[data-testid="input"]')).toHaveValue('');
    await expect(page.locator('[data-testid="output"]')).toHaveValue('');
  });

  test('Load Example button works', async ({ page }) => {
    await page.click('text=Load Example');
    
    // Check if example content is loaded
    const input = page.locator('[data-testid="input"]');
    await expect(input).not.toHaveValue('');
    await expect(input).toContainText('Welcome to HTML to Markdown Converter');
  });

  test('Advanced options can be toggled', async ({ page }) => {
    // Toggle advanced options
    await page.click('text=Advanced Options');
    
    // Check if advanced options are visible
    await expect(page.locator('.advanced-options')).toBeVisible();
    
    // Check if configuration options are present
    await expect(page.locator('text=Heading Style')).toBeVisible();
    await expect(page.locator('text=Bullet List Marker')).toBeVisible();
    await expect(page.locator('text=Code Block Style')).toBeVisible();
  });

  test('Configuration options affect output', async ({ page }) => {
    const htmlInput = '<h1>Title</h1><ul><li>Item</li></ul>';
    
    // Enable advanced options
    await page.click('text=Advanced Options');
    
    // Change bullet list marker to asterisk
    await page.selectOption('select', { label: 'Asterisk (*)' });
    
    await page.fill('[data-testid="input"]', htmlInput);
    
    const output = page.locator('[data-testid="output"]');
    await expect(output).toContainText('* Item');
  });

  test('Auto-sanitize option works', async ({ page }) => {
    const htmlWithScript = '<div>Content</div><script>alert("xss")</script>';
    
    // Ensure auto-sanitize is enabled
    const autoSanitizeSwitch = page.locator('text=Auto-sanitize HTML');
    await expect(autoSanitizeSwitch).toBeChecked();
    
    await page.fill('[data-testid="input"]', htmlWithScript);
    
    const output = page.locator('[data-testid="output"]');
    await expect(output).toContainText('Content');
    // Script should be removed, so output should not contain alert
    await expect(output).not.toContainText('alert');
  });

  test('Handles large HTML documents', async ({ page }) => {
    // Create a large HTML document
    const largeHtml = '<div>' + 'x'.repeat(50000) + '</div>';
    
    await page.fill('[data-testid="input"]', largeHtml);
    
    // Should show conversion status
    await expect(page.locator('.conversion-status')).toBeVisible();
    
    // Should still produce output
    const output = page.locator('[data-testid="output"]');
    await expect(output).not.toHaveValue('');
  });

  test('Shows character count in output', async ({ page }) => {
    const htmlInput = '<h1>Test</h1>';
    
    await page.fill('[data-testid="input"]', htmlInput);
    
    // Should show character count
    await expect(page.locator('text=characters')).toBeVisible();
  });

  test('File upload functionality works', async ({ page }) => {
    // Create a test HTML file
    const testHtml = '<h1>Uploaded Content</h1><p>This was uploaded from a file.</p>';
    
    // Create a file input and upload
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.html',
      mimeType: 'text/html',
      buffer: Buffer.from(testHtml)
    });
    
    // Check if content is loaded
    await expect(page.locator('[data-testid="input"]')).toContainText('Uploaded Content');
  });

  test('Error handling for invalid file upload', async ({ page }) => {
    // Try to upload a non-HTML file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('This is not HTML')
    });
    
    // Should show error message
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Please upload an HTML file');
  });

  test('Responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if layout adapts
    await expect(page.locator('.html-to-markdown-converter')).toBeVisible();
    
    // Check if advanced options are still accessible
    await page.click('text=Advanced Options');
    await expect(page.locator('.advanced-options')).toBeVisible();
  });

  test('Accessibility features work', async ({ page }) => {
    // Check for proper ARIA labels
    const input = page.locator('[data-testid="input"]');
    await expect(input).toHaveAttribute('data-testid', 'input');
    
    const output = page.locator('[data-testid="output"]');
    await expect(output).toHaveAttribute('data-testid', 'output');
    
    // Check for validation messages with proper roles
    await page.fill('[data-testid="input"]', '<div>Unclosed tag');
    await expect(page.locator('[role="alert"]')).toBeVisible();
  });
});
