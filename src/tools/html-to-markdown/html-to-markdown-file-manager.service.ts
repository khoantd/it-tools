import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { ProcessedFile } from './html-to-markdown-batch.types';
import { getMarkdownFileName } from './html-to-markdown-batch.service';

export class HTMLToMarkdownFileManager {
  async createZipFromFiles(files: ProcessedFile[], namingConvention: 'original' | 'timestamp' | 'indexed' = 'original'): Promise<Blob> {
    const zip = new JSZip();
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.status === 'completed' && file.markdownContent) {
        const markdownFileName = getMarkdownFileName(file.name, namingConvention, i);
        zip.file(markdownFileName, file.markdownContent);
      }
    }
    
    return await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6
      }
    });
  }

  async downloadZip(files: ProcessedFile[], zipName: string = 'html-to-markdown-batch.zip', namingConvention: 'original' | 'timestamp' | 'indexed' = 'original'): Promise<void> {
    try {
      const zipBlob = await this.createZipFromFiles(files, namingConvention);
      saveAs(zipBlob, zipName);
    } catch (error) {
      throw new Error(`Failed to create ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  downloadFile(content: string, filename: string): void {
    try {
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      saveAs(blob, filename);
    } catch (error) {
      throw new Error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async downloadMultipleFiles(files: ProcessedFile[], namingConvention: 'original' | 'timestamp' | 'indexed' = 'original'): Promise<void> {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.status === 'completed' && file.markdownContent) {
        const filename = getMarkdownFileName(file.name, namingConvention, i);
        this.downloadFile(file.markdownContent, filename);
        
        // Add small delay between downloads to prevent browser blocking
        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
  }

  async downloadSelectedFiles(files: ProcessedFile[], selectedIds: string[], namingConvention: 'original' | 'timestamp' | 'indexed' = 'original'): Promise<void> {
    const selectedFiles = files.filter(file => selectedIds.includes(file.id));
    await this.downloadMultipleFiles(selectedFiles, namingConvention);
  }

  async downloadSelectedAsZip(files: ProcessedFile[], selectedIds: string[], zipName: string = 'selected-files.zip', namingConvention: 'original' | 'timestamp' | 'indexed' = 'original'): Promise<void> {
    const selectedFiles = files.filter(file => selectedIds.includes(file.id));
    await this.downloadZip(selectedFiles, zipName, namingConvention);
  }

  // Utility methods
  getFilePreview(content: string, maxLength: number = 200): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + '...';
  }

  validateFileSize(size: number, maxSize: number = 10 * 1024 * 1024): boolean { // 10MB default
    return size <= maxSize;
  }

  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  sanitizeFilename(filename: string): string {
    // Remove or replace invalid characters for filenames
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  // Export statistics
  getExportStats(files: ProcessedFile[]): {
    totalFiles: number;
    completedFiles: number;
    failedFiles: number;
    totalSize: number;
    totalMarkdownSize: number;
  } {
    const completedFiles = files.filter(f => f.status === 'completed');
    const failedFiles = files.filter(f => f.status === 'error');
    
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const totalMarkdownSize = completedFiles.reduce((sum, file) => sum + file.markdownContent.length, 0);

    return {
      totalFiles: files.length,
      completedFiles: completedFiles.length,
      failedFiles: failedFiles.length,
      totalSize,
      totalMarkdownSize
    };
  }
}
