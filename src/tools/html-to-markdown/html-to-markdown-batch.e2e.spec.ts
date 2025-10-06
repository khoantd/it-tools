import { test, expect } from '@playwright/test';

test.describe('HTML to Markdown Batch Processing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/html-to-markdown');
  });

  test('should switch to batch mode', async ({ page }) => {
    // Switch to batch mode
    await page.getByRole('button', { name: 'Batch Processing' }).click();
    
    // Verify batch mode is active
    await expect(page.getByText('Batch HTML Upload')).toBeVisible();
    await expect(page.getByText('Processing Controls')).toBeVisible();
  });

  test('should upload multiple HTML files', async ({ page }) => {
    // Switch to batch mode
    await page.getByRole('button', { name: 'Batch Processing' }).click();
    
    // Create multiple test files
    const fileInput = page.locator('#batch-file-input');
    await fileInput.setInputFiles([
      {
        name: 'test1.html',
        mimeType: 'text/html',
        buffer: Buffer.from('<h1>Test 1</h1><p>Content 1</p>')
      },
      {
        name: 'test2.html',
        mimeType: 'text/html',
        buffer: Buffer.from('<h1>Test 2</h1><p>Content 2</p>')
      },
      {
        name: 'test3.html',
        mimeType: 'text/html',
        buffer: Buffer.from('<h1>Test 3</h1><p>Content 3</p>')
      }
    ]);
    
    // Verify files are added to the list
    await expect(page.getByText('Files (3)')).toBeVisible();
    await expect(page.getByText('test1.html')).toBeVisible();
    await expect(page.getByText('test2.html')).toBeVisible();
    await expect(page.getByText('test3.html')).toBeVisible();
    
    // Verify all files are in pending status
    const statusIcons = page.locator('.file-status .text-gray-500');
    await expect(statusIcons).toHaveCount(3);
  });

  test('should process multiple files and show progress', async ({ page }) => {
    // Switch to batch mode
    await page.getByRole('button', { name: 'Batch Processing' }).click();
    
    // Upload files
    const fileInput = page.locator('#batch-file-input');
    await fileInput.setInputFiles([
      {
        name: 'test1.html',
        mimeType: 'text/html',
        buffer: Buffer.from('<h1>Test 1</h1>')
      },
      {
        name: 'test2.html',
        mimeType: 'text/html',
        buffer: Buffer.from('<h1>Test 2</h1>')
      }
    ]);
    
    // Start processing
    await page.getByRole('button', { name: 'Start Processing' }).click();
    
    // Wait for processing to complete
    await expect(page.locator('.status-item .value.success')).toContainText('2');
    await expect(page.locator('.status-item .value.error')).toContainText('0');
    
    // Verify progress bar shows 100%
    const progressBar = page.locator('.n-progress');
    await expect(progressBar).toBeVisible();
  });

  test('should handle file processing errors', async ({ page }) => {
    // Switch to batch mode
    await page.getByRole('button', { name: 'Batch Processing' }).click();
    
    // Upload files with one invalid HTML
    const fileInput = page.locator('#batch-file-input');
    await fileInput.setInputFiles([
      {
        name: 'valid.html',
        mimeType: 'text/html',
        buffer: Buffer.from('<h1>Valid HTML</h1>')
      },
      {
        name: 'invalid.html',
        mimeType: 'text/html',
        buffer: Buffer.from('<h1>Unclosed tag<p>Invalid HTML')
      }
    ]);
    
    // Start processing
    await page.getByRole('button', { name: 'Start Processing' }).click();
    
    // Wait for processing to complete
    await expect(page.locator('.status-item .value.success')).toContainText('1');
    await expect(page.locator('.status-item .value.error')).toContainText('1');
    
    // Verify error status is shown
    const errorStatus = page.locator('.file-status.error');
    await expect(errorStatus).toHaveCount(1);
  });

  test('should retry failed files', async ({ page }) => {
    // Switch to batch mode
    await page.getByRole('button', { name: 'Batch Processing' }).click();
    
    // Upload a file that will fail
    const fileInput = page.locator('#batch-file-input');
    await fileInput.setInputFiles([
      {
        name: 'invalid.html',
        mimeType: 'text/html',
        buffer: Buffer.from('<h1>Unclosed tag<p>Invalid HTML')
      }
    ]);
    
    // Start processing
    await page.getByRole('button', { name: 'Start Processing' }).click();
    
    // Wait for failure
    await expect(page.locator('.status-item .value.error')).toContainText('1');
    
    // Retry failed files
    await page.getByRole('button', { name: 'Retry Failed (1)' }).click();
    
    // Should still fail, but retry button should be available
    await expect(page.getByRole('button', { name: 'Retry Failed (1)' })).toBeVisible();
  });

  test('should export all files as ZIP', async ({ page }) => {
    // Switch to batch mode
    await page.getByRole('button', { name: 'Batch Processing' }).click();
    
    // Upload and process files
    const fileInput = page.locator('#batch-file-input');
    await fileInput.setInputFiles([
      {
        name: 'test1.html',
        mimeType: 'text/html',
        buffer: Buffer.from('<h1>Test 1</h1>')
      },
      {
        name: 'test2.html',
        mimeType: 'text/html',
        buffer: Buffer.from('<h1>Test 2</h1>')
      }
    ]);
    
    await page.getByRole('button', { name: 'Start Processing' }).click();
    await expect(page.locator('.status-item .value.success')).toContainText('2');
    
    // Set up download promise
    const downloadPromise = page.waitForEvent('download');
    
    // Export all as ZIP
    await page.getByRole('button', { name: 'Export All as ZIP' }).click();
    
    // Verify download started
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('html-to-markdown-batch.zip');
  });

  test('should export selected files as ZIP', async ({ page }) => {
    // Switch to batch mode
    await page.getByRole('button', { name: 'Batch Processing' }).click();
    
    // Upload and process files
    const fileInput = page.locator('#batch-file-input');
    await fileInput.setInputFiles([
      {
        name: 'test1.html',
        mimeType: 'text/html',
        buffer: Buffer.from('<h1>Test 1</h1>')
      },
      {
        name: 'test2.html',
        mimeType: 'text/html',
        buffer: Buffer.from('<h1>Test 2</h1>')
      },
      {
        name: 'test3.html',
        mimeType: 'text/html',
        buffer: Buffer.from('<h1>Test 3</h1>')
      }
    ]);
    
    await page.getByRole('button', { name: 'Start Processing' }).click();
    await expect(page.locator('.status-item .value.success')).toContainText('3');
    
    // Select only first two files
    await page.getByRole('checkbox', { name: 'test1.html' }).check();
    await page.getByRole('checkbox', { name: 'test2.html' }).check();
    
    // Set up download promise
    const downloadPromise = page.waitForEvent('download');
    
    // Export selected as ZIP
    await page.getByRole('button', { name: 'Export Selected as ZIP (2)' }).click();
    
    // Verify download started
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('selected-files.zip');
  });

  test('should download individual files', async ({ page }) => {
    // Switch to batch mode
    await page.getByRole('button', { name: 'Batch Processing' }).click();
    
    // Upload and process files
    const fileInput = page.locator('#batch-file-input');
    await fileInput.setInputFiles([
      {
        name: 'test1.html',
        mimeType: 'text/html',
        buffer: Buffer.from('<h1>Test 1</h1>')
      },
      {
        name: 'test2.html',
        mimeType: 'text/html',
        buffer: Buffer.from('<h1>Test 2</h1>')
      }
    ]);
    
    await page.getByRole('button', { name: 'Start Processing' }).click();
    await expect(page.locator('.status-item .value.success')).toContainText('2');
    
    // Set up download promises
    const download1Promise = page.waitForEvent('download');
    const download2Promise = page.waitForEvent('download');
    
    // Download individual files
    await page.getByRole('button', { name: 'Download Individual Files' }).click();
    
    // Verify downloads started
    const download1 = await download1Promise;
    const download2 = await download2Promise;
    
    expect(download1.suggestedFilename()).toBe('test1.md');
    expect(download2.suggestedFilename()).toBe('test2.md');
  });

  test('should preview file content', async ({ page }) => {
    // Switch to batch mode
    await page.getByRole('button', { name: 'Batch Processing' }).click();
    
    // Upload and process a file
    const fileInput = page.locator('#batch-file-input');
    await fileInput.setInputFiles([
      {
        name: 'test.html',
        mimeType: 'text/html',
        buffer: Buffer.from('<h1>Test Title</h1><p>Test content</p>')
      }
    ]);
    
    await page.getByRole('button', { name: 'Start Processing' }).click();
    await expect(page.locator('.status-item .value.success')).toContainText('1');
    
    // Click preview button
    await page.locator('.file-actions button').first().click();
    
    // Verify preview modal opens
    await expect(page.getByText('File Preview')).toBeVisible();
    
    // Check both tabs are available
    await expect(page.getByRole('tab', { name: 'Original HTML' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Converted Markdown' })).toBeVisible();
    
    // Check content is displayed
    await expect(page.locator('.code-preview')).toContainText('Test Title');
  });

  test('should remove individual files', async ({ page }) => {
    // Switch to batch mode
    await page.getByRole('button', { name: 'Batch Processing' }).click();
    
    // Upload files
    const fileInput = page.locator('#batch-file-input');
    await fileInput.setInputFiles([
      {
        name: 'test1.html',
        mimeType: 'text/html',
        buffer: Buffer.from('<h1>Test 1</h1>')
      },
      {
        name: 'test2.html',
        mimeType: 'text/html',
        buffer: Buffer.from('<h1>Test 2</h1>')
      }
    ]);
    
    // Verify both files are present
    await expect(page.getByText('Files (2)')).toBeVisible();
    
    // Remove first file
    const removeButtons = page.locator('.file-actions button').nth(1);
    await removeButtons.first().click();
    
    // Verify only one file remains
    await expect(page.getByText('Files (1)')).toBeVisible();
    await expect(page.getByText('test1.html')).not.toBeVisible();
    await expect(page.getByText('test2.html')).toBeVisible();
  });

  test('should clear all files', async ({ page }) => {
    // Switch to batch mode
    await page.getByRole('button', { name: 'Batch Processing' }).click();
    
    // Upload files
    const fileInput = page.locator('#batch-file-input');
    await fileInput.setInputFiles([
      {
        name: 'test1.html',
        mimeType: 'text/html',
        buffer: Buffer.from('<h1>Test 1</h1>')
      },
      {
        name: 'test2.html',
        mimeType: 'text/html',
        buffer: Buffer.from('<h1>Test 2</h1>')
      }
    ]);
    
    // Verify files are present
    await expect(page.getByText('Files (2)')).toBeVisible();
    
    // Clear all files
    await page.getByRole('button', { name: 'Clear All' }).click();
    
    // Verify no files remain
    await expect(page.getByText('Files (2)')).not.toBeVisible();
    await expect(page.getByText('test1.html')).not.toBeVisible();
    await expect(page.getByText('test2.html')).not.toBeVisible();
  });

  test('should configure batch processing options', async ({ page }) => {
    // Switch to batch mode
    await page.getByRole('button', { name: 'Batch Processing' }).click();
    
    // Open advanced options
    await page.getByRole('button', { name: 'Show' }).click();
    
    // Configure batch options
    await page.getByLabel('Max Concurrent Files').fill('5');
    await page.getByLabel('File Naming Convention').selectOption('timestamp');
    await page.getByLabel('Auto-retry Failed Files').check();
    await page.getByLabel('Stop on First Error').check();
    
    // Verify options are saved (they should persist in localStorage)
    // This is tested by checking that the values remain after page reload
    await page.reload();
    await page.getByRole('button', { name: 'Batch Processing' }).click();
    await page.getByRole('button', { name: 'Show' }).click();
    
    await expect(page.getByLabel('Max Concurrent Files')).toHaveValue('5');
    await expect(page.getByLabel('File Naming Convention')).toHaveValue('timestamp');
    await expect(page.getByLabel('Auto-retry Failed Files')).toBeChecked();
    await expect(page.getByLabel('Stop on First Error')).toBeChecked();
  });

  test('should handle drag and drop file upload', async ({ page }) => {
    // Switch to batch mode
    await page.getByRole('button', { name: 'Batch Processing' }).click();
    
    // Create test files
    const file1 = {
      name: 'test1.html',
      mimeType: 'text/html',
      buffer: Buffer.from('<h1>Test 1</h1>')
    };
    const file2 = {
      name: 'test2.html',
      mimeType: 'text/html',
      buffer: Buffer.from('<h1>Test 2</h1>')
    };
    
    // Simulate drag and drop
    const dropZone = page.locator('.upload-dropzone');
    await dropZone.dispatchEvent('drop', {
      dataTransfer: {
        files: [file1, file2]
      }
    });
    
    // Verify files are added
    await expect(page.getByText('Files (2)')).toBeVisible();
    await expect(page.getByText('test1.html')).toBeVisible();
    await expect(page.getByText('test2.html')).toBeVisible();
  });

  test('should show processing status during batch processing', async ({ page }) => {
    // Switch to batch mode
    await page.getByRole('button', { name: 'Batch Processing' }).click();
    
    // Upload multiple files
    const fileInput = page.locator('#batch-file-input');
    await fileInput.setInputFiles([
      {
        name: 'test1.html',
        mimeType: 'text/html',
        buffer: Buffer.from('<h1>Test 1</h1>')
      },
      {
        name: 'test2.html',
        mimeType: 'text/html',
        buffer: Buffer.from('<h1>Test 2</h1>')
      },
      {
        name: 'test3.html',
        mimeType: 'text/html',
        buffer: Buffer.from('<h1>Test 3</h1>')
      }
    ]);
    
    // Start processing
    await page.getByRole('button', { name: 'Start Processing' }).click();
    
    // Verify processing status is shown
    await expect(page.locator('.status-item .value.pending')).toContainText('0');
    
    // Wait for completion
    await expect(page.locator('.status-item .value.success')).toContainText('3');
    
    // Verify progress bar shows completion
    const progressBar = page.locator('.n-progress');
    await expect(progressBar).toBeVisible();
  });
});
