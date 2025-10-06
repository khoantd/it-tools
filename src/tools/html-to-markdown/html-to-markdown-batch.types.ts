export interface ProcessedFile {
  id: string;
  name: string;
  originalContent: string;
  markdownContent: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  size: number;
  complexity: {
    charCount: number;
    tagCount: number;
    isComplex: boolean;
  };
  createdAt: Date;
}

export interface BatchProcessingState {
  files: ProcessedFile[];
  isProcessing: boolean;
  progress: number;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  pendingFiles: number;
}

export interface BatchProcessingOptions {
  maxConcurrent: number;
  autoRetry: boolean;
  stopOnError: boolean;
  namingConvention: 'original' | 'timestamp' | 'indexed';
}

export interface BatchProcessingEvents {
  onFileAdded: (file: ProcessedFile) => void;
  onFileProcessed: (file: ProcessedFile) => void;
  onFileFailed: (file: ProcessedFile, error: string) => void;
  onProgressUpdate: (progress: number) => void;
  onProcessingComplete: () => void;
  onProcessingError: (error: string) => void;
}
