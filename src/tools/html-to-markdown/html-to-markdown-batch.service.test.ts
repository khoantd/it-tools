import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HTMLToMarkdownBatchProcessor } from './html-to-markdown-batch.service';
import { defaultTurndownOptions } from './html-to-markdown.service';
import type { BatchProcessingOptions } from './html-to-markdown-batch.types';

// Mock File constructor
class MockFile extends File {
  private content: string;

  constructor(
    content: string[],
    filename: string,
    options: FilePropertyBag = {}
  ) {
    super(content, filename, options);
    this.content = content.join('');
  }

  async text(): Promise<string> {
    return this.content;
  }
}

describe('HTMLToMarkdownBatchProcessor', () => {
  let processor: HTMLToMarkdownBatchProcessor;
  let batchOptions: BatchProcessingOptions;

  beforeEach(() => {
    batchOptions = {
      maxConcurrent: 2,
      autoRetry: false,
      stopOnError: false,
      namingConvention: 'original'
    };
    processor = new HTMLToMarkdownBatchProcessor(defaultTurndownOptions, batchOptions);
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const defaultProcessor = new HTMLToMarkdownBatchProcessor(defaultTurndownOptions);
      const state = defaultProcessor.state;
      
      expect(state.files).toEqual([]);
      expect(state.isProcessing).toBe(false);
      expect(state.progress).toBe(0);
      expect(state.totalFiles).toBe(0);
      expect(state.completedFiles).toBe(0);
      expect(state.failedFiles).toBe(0);
      expect(state.pendingFiles).toBe(0);
    });

    it('should initialize with custom options', () => {
      const customOptions: BatchProcessingOptions = {
        maxConcurrent: 5,
        autoRetry: true,
        stopOnError: true,
        namingConvention: 'timestamp'
      };
      const customProcessor = new HTMLToMarkdownBatchProcessor(defaultTurndownOptions, customOptions);
      
      // We can't directly access private properties, but we can test behavior
      expect(customProcessor).toBeDefined();
    });
  });

  describe('addFiles', () => {
    it('should add valid HTML files', async () => {
      const files = [
        new MockFile(['<h1>Test 1</h1>'], 'test1.html', { type: 'text/html' }),
        new MockFile(['<h1>Test 2</h1>'], 'test2.html', { type: 'text/html' })
      ];

      const processedFiles = await processor.addFiles(files);
      
      expect(processedFiles).toHaveLength(2);
      expect(processedFiles[0].name).toBe('test1.html');
      expect(processedFiles[1].name).toBe('test2.html');
      expect(processedFiles[0].status).toBe('pending');
      expect(processedFiles[1].status).toBe('pending');
      
      const state = processor.state;
      expect(state.totalFiles).toBe(2);
      expect(state.pendingFiles).toBe(2);
    });

    it('should filter out invalid files', async () => {
      const files = [
        new MockFile(['<h1>Test 1</h1>'], 'test1.html', { type: 'text/html' }),
        new MockFile(['not html'], 'test.txt', { type: 'text/plain' }),
        new MockFile(['<h1>Test 2</h1>'], 'test2.html', { type: 'text/html' })
      ];

      const processedFiles = await processor.addFiles(files);
      
      expect(processedFiles).toHaveLength(2);
      expect(processedFiles[0].name).toBe('test1.html');
      expect(processedFiles[1].name).toBe('test2.html');
      
      const state = processor.state;
      expect(state.totalFiles).toBe(2);
    });

    it('should handle files with .htm extension', async () => {
      const files = [
        new MockFile(['<h1>Test</h1>'], 'test.htm', { type: 'text/html' })
      ];

      const processedFiles = await processor.addFiles(files);
      
      expect(processedFiles).toHaveLength(1);
      expect(processedFiles[0].name).toBe('test.htm');
    });

    it('should analyze file complexity', async () => {
      const complexHtml = '<div>' + 'x'.repeat(1000) + '</div>';
      const files = [
        new MockFile([complexHtml], 'complex.html', { type: 'text/html' })
      ];

      const processedFiles = await processor.addFiles(files);
      
      expect(processedFiles[0].complexity.charCount).toBeGreaterThan(1000);
      expect(processedFiles[0].complexity.tagCount).toBe(2);
    });
  });

  describe('processAll', () => {
    it('should process all pending files', async () => {
      const files = [
        new MockFile(['<h1>Test 1</h1>'], 'test1.html', { type: 'text/html' }),
        new MockFile(['<h1>Test 2</h1>'], 'test2.html', { type: 'text/html' })
      ];

      await processor.addFiles(files);
      await processor.processAll();
      
      const state = processor.state;
      expect(state.completedFiles).toBe(2);
      expect(state.failedFiles).toBe(0);
      expect(state.pendingFiles).toBe(0);
      expect(state.progress).toBe(100);
    });

    it('should handle processing errors gracefully', async () => {
      const files = [
        new MockFile(['<h1>Test 1</h1>'], 'test1.html', { type: 'text/html' }),
        new MockFile(['invalid html content'], 'test2.html', { type: 'text/html' })
      ];

      await processor.addFiles(files);
      await processor.processAll();
      
      const state = processor.state;
      expect(state.completedFiles).toBe(1);
      expect(state.failedFiles).toBe(1);
    });

    it('should respect maxConcurrent setting', async () => {
      const customOptions: BatchProcessingOptions = {
        maxConcurrent: 1,
        autoRetry: false,
        stopOnError: false,
        namingConvention: 'original'
      };
      const limitedProcessor = new HTMLToMarkdownBatchProcessor(defaultTurndownOptions, customOptions);
      
      const files = [
        new MockFile(['<h1>Test 1</h1>'], 'test1.html', { type: 'text/html' }),
        new MockFile(['<h1>Test 2</h1>'], 'test2.html', { type: 'text/html' }),
        new MockFile(['<h1>Test 3</h1>'], 'test3.html', { type: 'text/html' })
      ];

      await limitedProcessor.addFiles(files);
      await limitedProcessor.processAll();
      
      const state = limitedProcessor.state;
      expect(state.completedFiles).toBe(3);
    });

    it('should not process if already processing', async () => {
      const files = [
        new MockFile(['<h1>Test 1</h1>'], 'test1.html', { type: 'text/html' })
      ];

      await processor.addFiles(files);
      
      // Start processing
      const processPromise = processor.processAll();
      
      // Try to start processing again
      await processor.processAll();
      
      await processPromise;
      
      const state = processor.state;
      expect(state.completedFiles).toBe(1);
    });
  });

  describe('retryFailedFiles', () => {
    it('should retry failed files', async () => {
      const files = [
        new MockFile(['<h1>Test 1</h1>'], 'test1.html', { type: 'text/html' }),
        new MockFile(['invalid html'], 'test2.html', { type: 'text/html' })
      ];

      await processor.addFiles(files);
      await processor.processAll();
      
      let state = processor.state;
      expect(state.failedFiles).toBe(1);
      
      // Fix the failed file content
      const failedFile = state.files.find(f => f.status === 'error');
      if (failedFile) {
        failedFile.originalContent = '<h1>Fixed Test</h1>';
        failedFile.status = 'pending';
      }
      
      await processor.retryFailedFiles();
      
      state = processor.state;
      expect(state.completedFiles).toBe(2);
      expect(state.failedFiles).toBe(0);
    });
  });

  describe('file management', () => {
    it('should remove files', async () => {
      const files = [
        new MockFile(['<h1>Test 1</h1>'], 'test1.html', { type: 'text/html' }),
        new MockFile(['<h1>Test 2</h1>'], 'test2.html', { type: 'text/html' })
      ];

      const processedFiles = await processor.addFiles(files);
      const fileId = processedFiles[0].id;
      
      processor.removeFile(fileId);
      
      const state = processor.state;
      expect(state.totalFiles).toBe(1);
      expect(state.files.find(f => f.id === fileId)).toBeUndefined();
    });

    it('should clear all files', async () => {
      const files = [
        new MockFile(['<h1>Test 1</h1>'], 'test1.html', { type: 'text/html' }),
        new MockFile(['<h1>Test 2</h1>'], 'test2.html', { type: 'text/html' })
      ];

      await processor.addFiles(files);
      processor.clearAll();
      
      const state = processor.state;
      expect(state.totalFiles).toBe(0);
      expect(state.files).toEqual([]);
    });

    it('should get individual files', async () => {
      const files = [
        new MockFile(['<h1>Test 1</h1>'], 'test1.html', { type: 'text/html' })
      ];

      const processedFiles = await processor.addFiles(files);
      const fileId = processedFiles[0].id;
      
      const file = processor.getFile(fileId);
      expect(file).toBeDefined();
      expect(file?.name).toBe('test1.html');
      
      const nonExistentFile = processor.getFile('non-existent-id');
      expect(nonExistentFile).toBeUndefined();
    });

    it('should get completed and failed files', async () => {
      const files = [
        new MockFile(['<h1>Test 1</h1>'], 'test1.html', { type: 'text/html' }),
        new MockFile(['invalid html'], 'test2.html', { type: 'text/html' })
      ];

      await processor.addFiles(files);
      await processor.processAll();
      
      const completedFiles = processor.getCompletedFiles();
      const failedFiles = processor.getFailedFiles();
      
      expect(completedFiles).toHaveLength(1);
      expect(failedFiles).toHaveLength(1);
      expect(completedFiles[0].name).toBe('test1.html');
      expect(failedFiles[0].name).toBe('test2.html');
    });
  });

  describe('options management', () => {
    it('should update turndown options', () => {
      const newOptions = {
        ...defaultTurndownOptions,
        headingStyle: 'setext' as const
      };
      
      processor.updateTurndownOptions(newOptions);
      
      // We can't directly test the internal options, but we can test that it doesn't throw
      expect(() => processor.updateTurndownOptions(newOptions)).not.toThrow();
    });

    it('should update batch options', () => {
      const newBatchOptions: Partial<BatchProcessingOptions> = {
        maxConcurrent: 5,
        autoRetry: true
      };
      
      processor.updateBatchOptions(newBatchOptions);
      
      // We can't directly test the internal options, but we can test that it doesn't throw
      expect(() => processor.updateBatchOptions(newBatchOptions)).not.toThrow();
    });
  });

  describe('event handlers', () => {
    it('should call event handlers when set', async () => {
      const onFileAdded = vi.fn();
      const onFileProcessed = vi.fn();
      const onProgressUpdate = vi.fn();
      const onProcessingComplete = vi.fn();
      
      processor.setEventHandlers({
        onFileAdded,
        onFileProcessed,
        onProgressUpdate,
        onProcessingComplete
      });
      
      const files = [
        new MockFile(['<h1>Test 1</h1>'], 'test1.html', { type: 'text/html' })
      ];
      
      await processor.addFiles(files);
      expect(onFileAdded).toHaveBeenCalledTimes(1);
      
      await processor.processAll();
      expect(onFileProcessed).toHaveBeenCalledTimes(1);
      expect(onProgressUpdate).toHaveBeenCalled();
      expect(onProcessingComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('state management', () => {
    it('should provide accurate state information', async () => {
      const files = [
        new MockFile(['<h1>Test 1</h1>'], 'test1.html', { type: 'text/html' }),
        new MockFile(['<h1>Test 2</h1>'], 'test2.html', { type: 'text/html' })
      ];

      await processor.addFiles(files);
      
      let state = processor.state;
      expect(state.totalFiles).toBe(2);
      expect(state.pendingFiles).toBe(2);
      expect(state.completedFiles).toBe(0);
      expect(state.failedFiles).toBe(0);
      expect(state.progress).toBe(0);
      expect(state.isProcessing).toBe(false);
      
      await processor.processAll();
      
      state = processor.state;
      expect(state.totalFiles).toBe(2);
      expect(state.pendingFiles).toBe(0);
      expect(state.completedFiles).toBe(2);
      expect(state.failedFiles).toBe(0);
      expect(state.progress).toBe(100);
      expect(state.isProcessing).toBe(false);
    });
  });
});
