import { ref, computed, type Ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { 
  convertHtmlToMarkdown, 
  analyzeHTMLComplexity, 
  sanitizeHTML,
  type TurndownOptions 
} from './html-to-markdown.service';
import type { 
  ProcessedFile, 
  BatchProcessingState, 
  BatchProcessingOptions, 
  BatchProcessingEvents 
} from './html-to-markdown-batch.types';

export class HTMLToMarkdownBatchProcessor {
  private files: Map<string, ProcessedFile> = new Map();
  private processingQueue: string[] = [];
  private isProcessing = ref(false);
  private stateTick = ref(0);
  private options: TurndownOptions;
  private batchOptions: BatchProcessingOptions;
  private events: Partial<BatchProcessingEvents> = {};

  constructor(
    turndownOptions: TurndownOptions,
    batchOptions: BatchProcessingOptions = {
      maxConcurrent: 3,
      autoRetry: false,
      stopOnError: false,
      namingConvention: 'original'
    }
  ) {
    this.options = turndownOptions;
    this.batchOptions = batchOptions;
  }

  // Public API
  get state(): BatchProcessingState {
    // touch tick for reactivity on Map mutations
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.stateTick.value;
    const files = Array.from(this.files.values());
    const completedFiles = files.filter(f => f.status === 'completed').length;
    const failedFiles = files.filter(f => f.status === 'error').length;
    const pendingFiles = files.filter(f => f.status === 'pending').length;
    const totalFiles = files.length;
    const progress = totalFiles > 0 ? (completedFiles / totalFiles) * 100 : 0;

    return {
      files,
      isProcessing: this.isProcessing.value,
      progress,
      totalFiles,
      completedFiles,
      failedFiles,
      pendingFiles
    };
  }

  // Expose a reactive version ref so external computed values can explicitly depend on it
  get version() {
    return this.stateTick;
  }

  async addFiles(files: File[]): Promise<ProcessedFile[]> {
    const processedFiles: ProcessedFile[] = [];

    for (const file of files) {
      if (!this.isValidHtmlFile(file)) {
        continue;
      }

      const processedFile = await this.createProcessedFile(file);
      this.files.set(processedFile.id, processedFile);
      processedFiles.push(processedFile);
      
      this.events.onFileAdded?.(processedFile);
    }
    // Trigger reactivity so UI updates totals and pending count
    this.stateTick.value++;
    return processedFiles;
  }

  async processAll(): Promise<void> {
    if (this.isProcessing.value) {
      return;
    }

    this.isProcessing.value = true;
    this.stateTick.value++;
    const fileIds = Array.from(this.files.keys()).filter(id => {
      const file = this.files.get(id);
      return file && (file.status === 'pending' || (file.status === 'error' && this.batchOptions.autoRetry));
    });

    try {
      if (fileIds.length === 0) {
        this.events.onProgressUpdate?.(this.state.progress);
        this.events.onProcessingComplete?.();
        return;
      }
      // Process files in batches
      for (let i = 0; i < fileIds.length; i += this.batchOptions.maxConcurrent) {
        const batch = fileIds.slice(i, i + this.batchOptions.maxConcurrent);
        await Promise.all(batch.map(id => this.processFile(id)));
        
        // Update progress
        this.events.onProgressUpdate?.(this.state.progress);
      }

      this.events.onProcessingComplete?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.events.onProcessingError?.(errorMessage);
    } finally {
      this.isProcessing.value = false;
      this.stateTick.value++;
    }
  }

  async processFile(id: string): Promise<void> {
    const file = this.files.get(id);
    if (!file || file.status === 'processing') {
      return;
    }

    file.status = 'processing';
    this.stateTick.value++;

    try {
      // Sanitize HTML if needed
      const sanitizedHtml = sanitizeHTML(file.originalContent);
      
      // Convert to markdown
      const markdown = convertHtmlToMarkdown(sanitizedHtml, this.options);
      
      file.markdownContent = markdown;
      file.status = 'completed';
      this.stateTick.value++;
      
      this.events.onFileProcessed?.(file);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Conversion failed';
      file.status = 'error';
      file.error = errorMessage;
      this.stateTick.value++;
      
      this.events.onFileFailed?.(file, errorMessage);
      
      if (this.batchOptions.stopOnError) {
        throw error;
      }
    }
  }

  async retryFailedFiles(): Promise<void> {
    const failedFiles = Array.from(this.files.values()).filter(f => f.status === 'error');
    
    for (const file of failedFiles) {
      file.status = 'pending';
      file.error = undefined;
    }

    await this.processAll();
  }

  removeFile(id: string): void {
    this.files.delete(id);
    this.stateTick.value++;
  }

  clearAll(): void {
    this.files.clear();
    this.processingQueue = [];
    this.isProcessing.value = false;
    this.stateTick.value++;
  }

  getFile(id: string): ProcessedFile | undefined {
    return this.files.get(id);
  }

  getCompletedFiles(): ProcessedFile[] {
    return Array.from(this.files.values()).filter(f => f.status === 'completed');
  }

  getFailedFiles(): ProcessedFile[] {
    return Array.from(this.files.values()).filter(f => f.status === 'error');
  }

  updateTurndownOptions(options: TurndownOptions): void {
    this.options = options;
  }

  updateBatchOptions(options: Partial<BatchProcessingOptions>): void {
    this.batchOptions = { ...this.batchOptions, ...options };
  }

  setEventHandlers(events: Partial<BatchProcessingEvents>): void {
    this.events = { ...this.events, ...events };
  }

  // Private methods
  private async createProcessedFile(file: File): Promise<ProcessedFile> {
    const content = await file.text();
    const analysis = analyzeHTMLComplexity(content);
    
    return {
      id: uuidv4(),
      name: file.name,
      originalContent: content,
      markdownContent: '',
      status: 'pending',
      size: file.size,
      complexity: {
        charCount: content.length,
        tagCount: analysis.elementCount,
        isComplex: analysis.elementCount > 100 || content.length > 10000
      },
      createdAt: new Date()
    };
  }

  private isValidHtmlFile(file: File): boolean {
    const validExtensions = ['.html', '.htm'];
    const validMimeTypes = ['text/html', 'application/xhtml+xml'];
    
    const hasValidExtension = validExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
    
    const hasValidMimeType = validMimeTypes.some(mime => 
      file.type.toLowerCase().includes(mime)
    );
    
    return hasValidExtension || hasValidMimeType;
  }
}

// Utility functions
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getMarkdownFileName(originalName: string, convention: 'original' | 'timestamp' | 'indexed' = 'original', index?: number): string {
  const baseName = originalName.replace(/\.(html|htm)$/i, '');
  
  switch (convention) {
    case 'timestamp':
      return `${baseName}_${Date.now()}.md`;
    case 'indexed':
      return `${baseName}_${String(index || 0).padStart(3, '0')}.md`;
    case 'original':
    default:
      return `${baseName}.md`;
  }
}
