import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HTMLToMarkdownFileManager } from './html-to-markdown-file-manager.service';
import type { ProcessedFile } from './html-to-markdown-batch.types';

// Mock file-saver
vi.mock('file-saver', () => ({
  saveAs: vi.fn()
}));

// Mock JSZip
const mockZip = {
  file: vi.fn(),
  generateAsync: vi.fn().mockResolvedValue(new Blob(['mock zip content'], { type: 'application/zip' }))
};

vi.mock('jszip', () => ({
  default: vi.fn().mockImplementation(() => mockZip)
}));

describe('HTMLToMarkdownFileManager', () => {
  let fileManager: HTMLToMarkdownFileManager;
  let mockFiles: ProcessedFile[];

  beforeEach(() => {
    fileManager = new HTMLToMarkdownFileManager();
    mockFiles = [
      {
        id: '1',
        name: 'test1.html',
        originalContent: '<h1>Test 1</h1>',
        markdownContent: '# Test 1',
        status: 'completed',
        size: 100,
        complexity: { charCount: 15, tagCount: 2, isComplex: false },
        createdAt: new Date()
      },
      {
        id: '2',
        name: 'test2.html',
        originalContent: '<h1>Test 2</h1>',
        markdownContent: '# Test 2',
        status: 'completed',
        size: 100,
        complexity: { charCount: 15, tagCount: 2, isComplex: false },
        createdAt: new Date()
      },
      {
        id: '3',
        name: 'test3.html',
        originalContent: '<h1>Test 3</h1>',
        markdownContent: '# Test 3',
        status: 'error',
        error: 'Conversion failed',
        size: 100,
        complexity: { charCount: 15, tagCount: 2, isComplex: false },
        createdAt: new Date()
      }
    ];
  });

  describe('createZipFromFiles', () => {
    it('should create ZIP with completed files only', async () => {
      const zipBlob = await fileManager.createZipFromFiles(mockFiles);
      
      expect(zipBlob).toBeInstanceOf(Blob);
      expect(mockZip.file).toHaveBeenCalledTimes(2); // Only completed files
      expect(mockZip.file).toHaveBeenCalledWith('test1.md', '# Test 1');
      expect(mockZip.file).toHaveBeenCalledWith('test2.md', '# Test 2');
      expect(mockZip.generateAsync).toHaveBeenCalledWith({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
    });

    it('should use custom naming convention', async () => {
      const zipBlob = await fileManager.createZipFromFiles(mockFiles, 'timestamp');
      
      expect(zipBlob).toBeInstanceOf(Blob);
      expect(mockZip.file).toHaveBeenCalledTimes(2);
      // The exact filename will depend on the timestamp, but should contain the base name
      expect(mockZip.file).toHaveBeenCalledWith(expect.stringMatching(/test1_\d+\.md/), '# Test 1');
      expect(mockZip.file).toHaveBeenCalledWith(expect.stringMatching(/test2_\d+\.md/), '# Test 2');
    });

    it('should use indexed naming convention', async () => {
      const zipBlob = await fileManager.createZipFromFiles(mockFiles, 'indexed');
      
      expect(zipBlob).toBeInstanceOf(Blob);
      expect(mockZip.file).toHaveBeenCalledTimes(2);
      expect(mockZip.file).toHaveBeenCalledWith('test1_000.md', '# Test 1');
      expect(mockZip.file).toHaveBeenCalledWith('test2_001.md', '# Test 2');
    });

    it('should handle empty files array', async () => {
      const zipBlob = await fileManager.createZipFromFiles([]);
      
      expect(zipBlob).toBeInstanceOf(Blob);
      expect(mockZip.file).not.toHaveBeenCalled();
    });
  });

  describe('downloadZip', () => {
    it('should download ZIP file', async () => {
      const { saveAs } = await import('file-saver');
      
      await fileManager.downloadZip(mockFiles, 'test-batch.zip', 'original');
      
      expect(saveAs).toHaveBeenCalledWith(
        expect.any(Blob),
        'test-batch.zip'
      );
    });

    it('should use default filename', async () => {
      const { saveAs } = await import('file-saver');
      
      await fileManager.downloadZip(mockFiles);
      
      expect(saveAs).toHaveBeenCalledWith(
        expect.any(Blob),
        'html-to-markdown-batch.zip'
      );
    });

    it('should handle errors', async () => {
      mockZip.generateAsync.mockRejectedValueOnce(new Error('ZIP creation failed'));
      
      await expect(fileManager.downloadZip(mockFiles))
        .rejects.toThrow('Failed to create ZIP file: ZIP creation failed');
    });
  });

  describe('downloadFile', () => {
    it('should download individual file', async () => {
      const { saveAs } = await import('file-saver');
      
      fileManager.downloadFile('# Test content', 'test.md');
      
      expect(saveAs).toHaveBeenCalledWith(
        expect.any(Blob),
        'test.md'
      );
    });

    it('should handle download errors', async () => {
      const { saveAs } = await import('file-saver');
      (saveAs as any).mockImplementationOnce(() => {
        throw new Error('Download failed');
      });
      
      expect(() => fileManager.downloadFile('# Test content', 'test.md'))
        .toThrow('Failed to download file: Download failed');
    });
  });

  describe('downloadMultipleFiles', () => {
    it('should download multiple files with delay', async () => {
      const { saveAs } = await import('file-saver');
      
      await fileManager.downloadMultipleFiles(mockFiles, 'original');
      
      expect(saveAs).toHaveBeenCalledTimes(2); // Only completed files
      expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'test1.md');
      expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'test2.md');
    });

    it('should use custom naming convention', async () => {
      const { saveAs } = await import('file-saver');
      
      await fileManager.downloadMultipleFiles(mockFiles, 'indexed');
      
      expect(saveAs).toHaveBeenCalledTimes(2);
      expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'test1_000.md');
      expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'test2_001.md');
    });
  });

  describe('downloadSelectedFiles', () => {
    it('should download only selected files', async () => {
      const { saveAs } = await import('file-saver');
      const selectedIds = ['1']; // Only select first file
      
      await fileManager.downloadSelectedFiles(mockFiles, selectedIds, 'original');
      
      expect(saveAs).toHaveBeenCalledTimes(1);
      expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'test1.md');
    });

    it('should handle empty selection', async () => {
      const { saveAs } = await import('file-saver');
      
      await fileManager.downloadSelectedFiles(mockFiles, [], 'original');
      
      expect(saveAs).not.toHaveBeenCalled();
    });
  });

  describe('downloadSelectedAsZip', () => {
    it('should download selected files as ZIP', async () => {
      const { saveAs } = await import('file-saver');
      const selectedIds = ['1', '2'];
      
      await fileManager.downloadSelectedAsZip(mockFiles, selectedIds, 'selected.zip', 'original');
      
      expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'selected.zip');
      expect(mockZip.file).toHaveBeenCalledTimes(2);
    });
  });

  describe('utility methods', () => {
    it('should get file preview', () => {
      const longContent = 'a'.repeat(300);
      const preview = fileManager.getFilePreview(longContent, 200);
      
      expect(preview).toHaveLength(203); // 200 + '...'
      expect(preview).toMatch(/\.\.\.$/);
    });

    it('should return full content if shorter than max length', () => {
      const shortContent = 'short content';
      const preview = fileManager.getFilePreview(shortContent, 200);
      
      expect(preview).toBe(shortContent);
    });

    it('should validate file size', () => {
      expect(fileManager.validateFileSize(1024)).toBe(true);
      expect(fileManager.validateFileSize(10 * 1024 * 1024)).toBe(true);
      expect(fileManager.validateFileSize(11 * 1024 * 1024)).toBe(false);
    });

    it('should get file extension', () => {
      expect(fileManager.getFileExtension('test.html')).toBe('html');
      expect(fileManager.getFileExtension('test.HTML')).toBe('html');
      expect(fileManager.getFileExtension('test')).toBe('');
    });

    it('should sanitize filename', () => {
      expect(fileManager.sanitizeFilename('test<file>.html')).toBe('test_file_.html');
      expect(fileManager.sanitizeFilename('test file.html')).toBe('test_file.html');
      expect(fileManager.sanitizeFilename('test___file.html')).toBe('test_file.html');
      expect(fileManager.sanitizeFilename('_test_file_.html')).toBe('test_file.html');
    });

    it('should get export statistics', () => {
      const stats = fileManager.getExportStats(mockFiles);
      
      expect(stats.totalFiles).toBe(3);
      expect(stats.completedFiles).toBe(2);
      expect(stats.failedFiles).toBe(1);
      expect(stats.totalSize).toBe(300); // 3 files * 100 bytes each
      expect(stats.totalMarkdownSize).toBe(16); // '# Test 1' + '# Test 2' = 16 chars
    });
  });
});
