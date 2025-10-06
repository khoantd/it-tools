<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useStorage } from '@vueuse/core';
import { useValidation } from '@/composable/validation';
import { useCopy } from '@/composable/copy';
import { withDefaultOnError } from '@/utils/defaults';
import { NButton, NDivider, NFormItem, NIcon, NInputNumber, NSelect, NSwitch, NText, NUpload, NUploadDragger, NProgress, NCheckbox, NCheckboxGroup, NModal, NTabs, NTabPane, NCard, NGrid, NGi, NAlert, NSpin } from 'naive-ui';
import { FileText, Settings, Upload, Download, Folder, Eye, Trash, Refresh, PlayerPlay, PlayerPause, CircleCheck, CircleX, Clock, AlertCircle } from '@vicons/tabler';
import TextareaCopyable from '@/components/TextareaCopyable.vue';
import CCard from '@/ui/c-card/c-card.vue';
import CInputText from '@/ui/c-input-text/c-input-text.vue';
import CButton from '@/ui/c-button/c-button.vue';
import CTooltip from '@/ui/c-tooltip/c-tooltip.vue';
import { 
  convertHtmlToMarkdown, 
  isValidHTML, 
  sanitizeHTML, 
  analyzeHTMLComplexity,
  type TurndownOptions,
  defaultTurndownOptions 
} from './html-to-markdown.service';
import { HTMLToMarkdownBatchProcessor } from './html-to-markdown-batch.service';
import { HTMLToMarkdownFileManager } from './html-to-markdown-file-manager.service';
import type { ProcessedFile, BatchProcessingOptions } from './html-to-markdown-batch.types';
import { formatFileSize } from './html-to-markdown-batch.service';

// Mode selection
const mode = useStorage<'single' | 'batch'>('html-to-markdown:mode', 'single');

// Single file processing (existing functionality)
const inputHtml = ref('');
const isConverting = ref(false);
const conversionError = ref('');
const inputElement = ref<HTMLElement>();
const batchFileInput = ref<HTMLInputElement | null>(null);

// Configuration options stored in localStorage
const turndownOptions = useStorage<TurndownOptions>('html-to-markdown:options', defaultTurndownOptions);
const showAdvancedOptions = useStorage('html-to-markdown:show-advanced', false);
const autoSanitize = useStorage('html-to-markdown:auto-sanitize', true);

// Batch processing
const batchProcessor = new HTMLToMarkdownBatchProcessor(turndownOptions.value);
const fileManager = new HTMLToMarkdownFileManager();
const selectedFiles = ref<string[]>([]);
const showPreview = ref(false);
const previewFile = ref<ProcessedFile | null>(null);
const activeTab = ref('original');

// Simple batch logs
const logs = ref<string[]>([]);
function addLog(message: string) {
  const time = new Date().toLocaleTimeString();
  logs.value.push(`${time} - ${message}`);
}
function clearLogs() {
  logs.value = [];
}

// Batch processing options
const batchOptions = useStorage<BatchProcessingOptions>('html-to-markdown:batch-options', {
  maxConcurrent: 3,
  autoRetry: false,
  stopOnError: false,
  namingConvention: 'original'
});

// Set up batch processor event handlers
batchProcessor.setEventHandlers({
  onFileAdded: (file) => {
    console.log('File added:', file.name);
    addLog(`Added file: ${file.name}`);
  },
  onFileProcessed: (file) => {
    console.log('File processed:', file.name, file.status);
    addLog(`Processed file: ${file.name} (${file.status})`);
  },
  onFileFailed: (file, error) => {
    console.log('File failed:', file.name, error);
    addLog(`Failed file: ${file.name} (${error})`);
  },
  onProgressUpdate: (progress) => {
    console.log('Progress updated:', progress);
    addLog(`Progress: ${Math.round(progress)}%`);
  },
  onProcessingComplete: () => {
    console.log('Processing complete');
    addLog('Processing complete');
  },
  onProcessingError: (error) => {
    console.error('Processing error:', error);
    addLog(`Processing error: ${error}`);
  }
});

// Update batch processor options when they change
watch(turndownOptions, (newOptions) => {
  batchProcessor.updateTurndownOptions(newOptions);
}, { deep: true });

watch(batchOptions, (newOptions) => {
  batchProcessor.updateBatchOptions(newOptions);
}, { deep: true });

// Computed properties
const batchState = computed(() => batchProcessor.state);
const completedFiles = computed(() => batchState.value.files.filter(f => f.status === 'completed'));
const failedFiles = computed(() => batchState.value.files.filter(f => f.status === 'error'));
const pendingFiles = computed(() => batchState.value.files.filter(f => f.status === 'pending'));
const canStartProcessing = computed(() => {
  if (batchState.value.isProcessing) return false;
  const hasPending = pendingFiles.value.length > 0;
  const canRetry = batchOptions.value.autoRetry && failedFiles.value.length > 0;
  return hasPending || canRetry;
});

// Single file validation
const htmlValidation = useValidation({
  source: inputHtml,
  rules: [
    {
      validator: (value: string) => {
        if (!value.trim()) return true;
        return isValidHTML(value);
      },
      message: 'Provided HTML is not valid or contains parsing errors.',
    },
    {
      validator: (value: string) => value.length <= 100000,
      message: 'HTML content is too large (max 100,000 characters).',
    },
  ],
});

// Single file processing
const sanitizedHtml = computed(() => {
  if (!inputHtml.value.trim() || !autoSanitize.value) return inputHtml.value;
  return sanitizeHTML(inputHtml.value);
});

const htmlComplexity = computed(() => {
  if (!sanitizedHtml.value.trim()) return { charCount: 0, tagCount: 0, isComplex: false };
  const analysis = analyzeHTMLComplexity(sanitizedHtml.value);
  return {
    charCount: sanitizedHtml.value.length,
    tagCount: analysis.elementCount,
    isComplex: analysis.elementCount > 100 || sanitizedHtml.value.length > 10000
  };
});

const outputMarkdown = computed(() => {
  if (!sanitizedHtml.value.trim()) return '';
  
  try {
    conversionError.value = '';
    return withDefaultOnError(() => {
      return convertHtmlToMarkdown(sanitizedHtml.value, turndownOptions.value);
    }, '');
  } catch (error) {
    conversionError.value = error instanceof Error ? error.message : 'Conversion failed';
    return '';
  }
});

// Copy functionality
const { copy: copyMarkdown } = useCopy({ 
  source: outputMarkdown, 
  text: 'Markdown copied to clipboard' 
});

// File upload handlers
const handleFileUpload = async (data: { file: any; fileList: any[]; event?: Event }) => {
  const file = data.file.file;
  
  if (!file) return;
  
  if (!file.type.includes('html') && !file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
    conversionError.value = 'Please upload an HTML file (.html or .htm)';
    return;
  }
  
  try {
    const content = await file.text();
    inputHtml.value = content;
    conversionError.value = '';
  } catch (error) {
    conversionError.value = 'Failed to read file: ' + (error instanceof Error ? error.message : 'Unknown error');
  }
};

// Batch file upload handlers
const handleMultipleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = Array.from(target.files || []);
  console.log('Files selected:', files.map(f => f.name));
  try {
    const addedFiles = await batchProcessor.addFiles(files);
    console.log('Files added to processor:', addedFiles.map(f => f.name));
  } catch (error) {
    console.error('Error adding files:', error);
  }
  target.value = '';
};

const handleDrop = async (event: DragEvent) => {
  event.preventDefault();
  const files = Array.from(event.dataTransfer?.files || []);
  const htmlFiles = files.filter(f => 
    f.type.includes('html') || f.name.endsWith('.html') || f.name.endsWith('.htm')
  );
  console.log('Files dropped:', files.map(f => f.name));
  console.log('HTML files filtered:', htmlFiles.map(f => f.name));
  try {
    const addedFiles = await batchProcessor.addFiles(htmlFiles);
    console.log('Files added to processor:', addedFiles.map(f => f.name));
  } catch (error) {
    console.error('Error adding files:', error);
  }
};

// Batch processing controls
const startBatchProcessing = async () => {
  const total = batchState.value.totalFiles;
  const pending = pendingFiles.value.length;
  const failed = failedFiles.value.length;
  addLog(`Start pressed. Files: total=${total}, pending=${pending}, failed=${failed}, autoRetry=${batchOptions.value.autoRetry}, maxConcurrent=${batchOptions.value.maxConcurrent}`);
  try {
    await batchProcessor.processAll();
  } catch (e) {
    addLog(`ProcessAll threw: ${(e as Error)?.message ?? e}`);
  }
};

const retryFailedFiles = async () => {
  await batchProcessor.retryFailedFiles();
};

const removeFile = (id: string) => {
  batchProcessor.removeFile(id);
  selectedFiles.value = selectedFiles.value.filter(fileId => fileId !== id);
  console.log('File removed:', id);
};

const clearAllFiles = () => {
  batchProcessor.clearAll();
  selectedFiles.value = [];
};

// Export functions
const exportAllAsZip = async () => {
  try {
    await fileManager.downloadZip(completedFiles.value, 'html-to-markdown-batch.zip', batchOptions.value.namingConvention);
  } catch (error) {
    console.error('Export failed:', error);
  }
};

const exportSelected = async () => {
  try {
    await fileManager.downloadSelectedFiles(completedFiles.value, selectedFiles.value, batchOptions.value.namingConvention);
  } catch (error) {
    console.error('Export failed:', error);
  }
};

const exportSelectedAsZip = async () => {
  try {
    await fileManager.downloadSelectedAsZip(completedFiles.value, selectedFiles.value, 'selected-files.zip', batchOptions.value.namingConvention);
  } catch (error) {
    console.error('Export failed:', error);
  }
};

const exportIndividual = async () => {
  try {
    await fileManager.downloadMultipleFiles(completedFiles.value, batchOptions.value.namingConvention);
  } catch (error) {
    console.error('Export failed:', error);
  }
};

// File preview
const previewFileContent = (file: ProcessedFile) => {
  previewFile.value = file;
  showPreview.value = true;
};

// Clear single file content
const clearAll = () => {
  inputHtml.value = '';
  conversionError.value = '';
};

// Click batch file input
const clickBatchFileInput = () => {
  if (batchFileInput.value) {
    batchFileInput.value.click();
  }
};

// Watch for changes to show conversion status
watch([inputHtml, turndownOptions], () => {
  if (inputHtml.value.trim() && htmlComplexity.value.tagCount > 100) {
    isConverting.value = true;
    setTimeout(() => {
      isConverting.value = false;
    }, 100);
  } else {
    isConverting.value = false;
  }
}, { immediate: true });

// Update batch processor options when they change
watch([turndownOptions, batchOptions], () => {
  batchProcessor.updateTurndownOptions(turndownOptions.value);
  batchProcessor.updateBatchOptions(batchOptions.value);
}, { deep: true });

// Turndown options for select components
const headingStyleOptions = [
  { label: 'ATX (# Heading)', value: 'atx' },
  { label: 'Setext (Heading ===)', value: 'setext' },
];

const bulletListMarkerOptions = [
  { label: 'Dash (- Item)', value: '-' },
  { label: 'Asterisk (* Item)', value: '*' },
  { label: 'Plus (+ Item)', value: '+' },
];

const codeBlockStyleOptions = [
  { label: 'Fenced (```code```)', value: 'fenced' },
  { label: 'Indented (    code)', value: 'indented' },
];

const emDelimiterOptions = [
  { label: 'Asterisk (*italic*)', value: '*' },
  { label: 'Underscore (_italic_)', value: '_' },
];

const strongDelimiterOptions = [
  { label: 'Asterisk (**bold**)', value: '**' },
  { label: 'Underscore (__bold__)', value: '__' },
];

const linkStyleOptions = [
  { label: 'Inlined ([text](url))', value: 'inlined' },
  { label: 'Referenced ([text][id])', value: 'referenced' },
];

const namingConventionOptions = [
  { label: 'Original filename', value: 'original' },
  { label: 'With timestamp', value: 'timestamp' },
  { label: 'With index', value: 'indexed' },
];

// Default example HTML
const exampleHtml = `<h1>Welcome to HTML to Markdown Converter</h1>
<p>This tool converts <strong>HTML</strong> content to <em>Markdown</em> format.</p>

<h2>Features</h2>
<ul>
  <li>Convert HTML elements to Markdown</li>
  <li>Support for various HTML structures</li>
  <li>Customizable conversion options</li>
</ul>

<blockquote>
  <p>This is a blockquote example.</p>
</blockquote>

<pre><code>console.log('Hello, World!');</code></pre>`;

// Initialize with example
onMounted(() => {
  if (!inputHtml.value) {
    inputHtml.value = exampleHtml;
  }
});
</script>

<template>
  <div class="html-to-markdown-tool">
    <!-- Mode Selection -->
    <c-card :title="$t('tools.html-to-markdown.batch.headings.processingMode')">
      <div class="mode-selection">
        <n-button 
          :type="mode === 'single' ? 'primary' : 'default'"
          @click="mode = 'single'"
          class="mode-button"
        >
          <n-icon :component="FileText" />
          Single File
        </n-button>
        <n-button 
          :type="mode === 'batch' ? 'primary' : 'default'"
          @click="mode = 'batch'"
          class="mode-button"
        >
          <n-icon :component="Folder" />
          Batch Processing
        </n-button>
      </div>
    </c-card>

    <!-- Single File Mode -->
    <div v-if="mode === 'single'">
      <c-card title="HTML Input">
        <n-upload
          :show-file-list="false"
          :max="1"
          @change="handleFileUpload"
          accept=".html,.htm,text/html"
          class="mb-4"
        >
          <n-upload-dragger>
            <div class="flex flex-col items-center justify-center p-4">
              <n-icon :component="Upload" size="48" class="text-gray-400" />
              <n-text class="mt-2 text-sm text-gray-600">
                Drag and drop an HTML file here
              </n-text>
              <n-text depth="3" class="text-xs text-gray-500">
                or click to select a file
              </n-text>
            </div>
          </n-upload-dragger>
        </n-upload>

        <n-form-item
          label="Your HTML content"
          :feedback="htmlValidation.message"
          :validation-status="htmlValidation.status"
        >
          <c-input-text
            ref="inputElement"
            v-model:value="inputHtml"
            multiline
            raw-text
            placeholder="Paste your HTML content here or upload a file..."
            rows="12"
            autofocus
            data-testid="input"
            :aria-describedby="htmlValidation.message ? 'html-validation' : undefined"
            monospace
          />
        </n-form-item>

        <div
          v-if="htmlValidation.message"
          id="html-validation"
          role="alert"
          class="text-red-500 text-sm mt-1"
        >
          {{ htmlValidation.message }}
        </div>

        <div class="flex justify-between items-center mt-4">
          <div class="text-sm text-gray-600">
            Characters: {{ htmlComplexity.charCount }} | Tags: {{ htmlComplexity.tagCount }}
            <span v-if="htmlComplexity.isComplex" class="text-orange-500 ml-2">(Complex)</span>
          </div>
          <c-button size="small" @click="clearAll">
            Clear
          </c-button>
        </div>
      </c-card>

      <c-card title="Markdown Output" class="mt-4">
        <n-form-item label="Converted Markdown">
          <n-text v-if="isConverting" class="text-gray-500">Converting...</n-text>
          <n-text v-else-if="conversionError" class="text-red-500">{{ conversionError }}</n-text>
          <TextareaCopyable
            v-else
            :value="outputMarkdown"
            :word-wrap="true"
            language="markdown"
            data-testid="output"
            :aria-label="`Converted markdown: ${outputMarkdown.length} characters`"
            :follow-height-of="inputHtml.length > 1000 ? undefined : inputElement"
          />
        </n-form-item>

        <div class="flex justify-center gap-3 mt-4">
          <c-button 
            :disabled="!outputMarkdown"
            @click="copyMarkdown"
          >
            Copy Markdown
          </c-button>
        </div>
      </c-card>
    </div>

    <!-- Batch Processing Mode -->
    <div v-if="mode === 'batch'">
      <!-- Batch Upload Section -->
      <c-card :title="$t('tools.html-to-markdown.batch.headings.batchUpload')">
        <div class="upload-area">
          <input 
            ref="batchFileInput"
            type="file" 
            multiple 
            accept=".html,.htm,text/html"
            @change="handleMultipleFileUpload"
            class="file-input"
            style="display: none;"
            id="batch-file-input"
          />
          <div 
            class="upload-dropzone" 
            @drop="handleDrop" 
            @dragover.prevent
            @click="clickBatchFileInput"
          >
            <n-icon :component="Upload" size="48" class="text-gray-400" />
            <n-text class="mt-2 text-sm text-gray-600">
              {{ $t('tools.html-to-markdown.batch.upload.dragDrop') }}
            </n-text>
            <n-text depth="3" class="text-xs text-gray-500">
              {{ $t('tools.html-to-markdown.batch.upload.clickToUpload') }}
            </n-text>
          </div>
        </div>

        <!-- File List -->
        <div v-if="batchState.files.length > 0" class="file-list mt-4">
          <div class="flex justify-between items-center mb-2">
            <n-text strong>Files ({{ batchState.files.length }})</n-text>
            <c-button size="small" @click="clearAllFiles">
              Clear All
            </c-button>
          </div>
          
          <div class="file-items">
            <div v-for="file in batchState.files" :key="file.id" class="file-item">
              <div class="file-info">
                <div class="file-name-status">
                  <span class="file-name">{{ file.name }}</span>
                  <span class="file-status" :class="file.status">
                    <n-icon 
                      :component="file.status === 'completed' ? CircleCheck : 
                                 file.status === 'error' ? CircleX : 
                                 file.status === 'processing' ? Refresh : Clock"
                      :class="file.status === 'completed' ? 'text-green-500' : 
                              file.status === 'error' ? 'text-red-500' : 
                              file.status === 'processing' ? 'text-blue-500' : 'text-gray-500'"
                    />
                    {{ file.status }}
                  </span>
                </div>
                <div class="file-details">
                  <span class="file-size">{{ formatFileSize(file.size) }}</span>
                  <span v-if="file.error" class="file-error">{{ file.error }}</span>
                </div>
              </div>
              <div class="file-actions">
                <c-button 
                  size="small" 
                  @click="previewFileContent(file)"
                  :disabled="file.status !== 'completed'"
                >
                  <n-icon :component="Eye" />
                </c-button>
                <c-button size="small" @click="removeFile(file.id)">
                  <n-icon :component="Trash" />
                </c-button>
              </div>
            </div>
          </div>
        </div>
      </c-card>

      <!-- Batch Processing Controls -->
      <c-card :title="$t('tools.html-to-markdown.batch.headings.processingControls')" class="mt-4">
        <div class="processing-controls">
          <div class="progress-info mb-4">
            <div class="status-grid">
              <div class="status-item">
                <span class="label">{{ $t('tools.html-to-markdown.batch.stats.total') }}:</span>
                <span class="value">{{ batchState.totalFiles }}</span>
              </div>
              <div class="status-item">
                <span class="label">{{ $t('tools.html-to-markdown.batch.stats.completed') }}:</span>
                <span class="value success">{{ batchState.completedFiles }}</span>
              </div>
              <div class="status-item">
                <span class="label">{{ $t('tools.html-to-markdown.batch.stats.failed') }}:</span>
                <span class="value error">{{ batchState.failedFiles }}</span>
              </div>
              <div class="status-item">
                <span class="label">{{ $t('tools.html-to-markdown.batch.stats.pending') }}:</span>
                <span class="value pending">{{ batchState.pendingFiles }}</span>
              </div>
            </div>
            
            <n-progress 
              :percentage="Math.round(batchState.progress)" 
              :status="batchState.isProcessing ? 'success' : 'default'"
              class="mt-2"
            />
          </div>
          
          <div class="action-buttons">
            <c-button 
              :disabled="!canStartProcessing"
              @click="startBatchProcessing"
            >
              <n-icon :component="PlayerPlay" />
              {{ $t('tools.html-to-markdown.batch.processing.start') }}
            </c-button>
            
            <c-button 
              @click="retryFailedFiles" 
              :disabled="batchState.failedFiles === 0"
            >
              <n-icon :component="Refresh" />
              {{ $t('tools.html-to-markdown.batch.processing.retry') }} ({{ batchState.failedFiles }})
            </c-button>
          </div>
        </div>
      </c-card>

      <!-- Export Options -->
      <c-card :title="$t('tools.html-to-markdown.batch.headings.exportOptions')" class="mt-4" v-if="completedFiles.length > 0">
        <div class="export-controls">
          <div class="file-selection mb-4">
            <n-text strong class="mb-2 block">{{ $t('tools.html-to-markdown.batch.export.selectFiles') }}</n-text>
            <n-checkbox-group v-model:value="selectedFiles">
              <div class="checkbox-list">
                <n-checkbox 
                  v-for="file in completedFiles" 
                  :key="file.id" 
                  :value="file.id"
                  class="checkbox-item"
                >
                  {{ file.name }}
                </n-checkbox>
              </div>
            </n-checkbox-group>
          </div>
          
          <div class="export-buttons">
            <c-button @click="exportAllAsZip" :disabled="completedFiles.length === 0">
              <n-icon :component="Download" />
              Export All as ZIP
            </c-button>
            
            <c-button @click="exportSelectedAsZip" :disabled="selectedFiles.length === 0">
              <n-icon :component="Download" />
              Export Selected as ZIP ({{ selectedFiles.length }})
            </c-button>
            
            <c-button @click="exportIndividual" :disabled="completedFiles.length === 0">
              <n-icon :component="Download" />
              Download Individual Files
            </c-button>
          </div>
        </div>
      </c-card>

      <!-- Logs -->
      <c-card :title="$t('tools.html-to-markdown.batch.headings.logs')" class="mt-4">
        <div class="flex justify-between items-center mb-2">
          <n-text depth="3">Real-time batch events</n-text>
          <c-button size="small" @click="clearLogs">{{ $t('tools.html-to-markdown.batch.actions.clearLogs') }}</c-button>
        </div>
        <div class="log-container">
          <pre class="log-content">{{ logs.join('\n') }}</pre>
        </div>
      </c-card>
    </div>

    <!-- Advanced Options (shared between modes) -->
    <c-card title="Conversion Options" class="mt-4">
      <div class="flex items-center justify-between mb-4">
        <n-text strong>Advanced Options</n-text>
        <c-button
          size="small"
          variant="text"
          @click="showAdvancedOptions = !showAdvancedOptions"
        >
          <n-icon :component="Settings" />
          <span class="ml-1">{{ showAdvancedOptions ? 'Hide' : 'Show' }}</span>
        </c-button>
      </div>

      <div v-if="showAdvancedOptions" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <n-form-item label="Heading Style">
          <n-select v-model:value="turndownOptions.headingStyle" :options="headingStyleOptions" />
        </n-form-item>
        <n-form-item label="Bullet List Marker">
          <n-select v-model:value="turndownOptions.bulletListMarker" :options="bulletListMarkerOptions" />
        </n-form-item>
        <n-form-item label="Code Block Style">
          <n-select v-model:value="turndownOptions.codeBlockStyle" :options="codeBlockStyleOptions" />
        </n-form-item>
        <n-form-item label="Emphasis Delimiter">
          <n-select v-model:value="turndownOptions.emDelimiter" :options="emDelimiterOptions" />
        </n-form-item>
        <n-form-item label="Strong Delimiter">
          <n-select v-model:value="turndownOptions.strongDelimiter" :options="strongDelimiterOptions" />
        </n-form-item>
        <n-form-item label="Link Style">
          <n-select v-model:value="turndownOptions.linkStyle" :options="linkStyleOptions" />
        </n-form-item>
        <n-form-item label="Auto Sanitize HTML">
          <n-switch v-model:value="autoSanitize" />
          <c-tooltip tooltip="Automatically remove potentially dangerous HTML elements" position="right">
            <n-icon :component="AlertCircle" class="ml-2 cursor-help" />
          </c-tooltip>
        </n-form-item>
        
        <!-- Batch-specific options -->
        <div v-if="mode === 'batch'" class="col-span-2">
          <n-divider />
          <n-text strong class="block mb-2">Batch Processing Options</n-text>
          <n-grid cols="2" x-gap="12">
            <n-gi>
              <n-form-item label="Max Concurrent Files">
                <n-input-number 
                  v-model:value="batchOptions.maxConcurrent" 
                  :min="1" 
                  :max="10"
                  placeholder="Files to process simultaneously"
                />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="File Naming Convention">
                <n-select v-model:value="batchOptions.namingConvention" :options="namingConventionOptions" />
              </n-form-item>
            </n-gi>
          </n-grid>
          <n-grid cols="2" x-gap="12">
            <n-gi>
              <n-form-item label="Auto-retry Failed Files">
                <n-switch v-model:value="batchOptions.autoRetry" />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="Stop on First Error">
                <n-switch v-model:value="batchOptions.stopOnError" />
              </n-form-item>
            </n-gi>
          </n-grid>
        </div>
      </div>
    </c-card>

    <!-- File Preview Modal -->
    <n-modal v-model:show="showPreview" preset="card" :title="$t('tools.html-to-markdown.batch.preview.title')" size="huge">
      <div v-if="previewFile" class="file-preview">
        <n-tabs v-model:value="activeTab">
          <n-tab-pane name="original" :tab="$t('tools.html-to-markdown.batch.preview.original')">
            <pre class="code-preview">{{ previewFile.originalContent }}</pre>
          </n-tab-pane>
          <n-tab-pane name="markdown" :tab="$t('tools.html-to-markdown.batch.preview.markdown')">
            <pre class="code-preview">{{ previewFile.markdownContent }}</pre>
          </n-tab-pane>
        </n-tabs>
      </div>
    </n-modal>
  </div>
</template>

<style scoped>
.html-to-markdown-tool {
  max-width: 1200px;
  margin: 0 auto;
}

.mode-selection {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.mode-button {
  min-width: 120px;
}

.upload-area {
  position: relative;
}

.upload-dropzone {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background-color: #f9fafb;
}

.upload-dropzone:hover {
  border-color: #3b82f6;
  background-color: #eff6ff;
}

.file-list {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  background-color: #f9fafb;
}

.file-items {
  max-height: 300px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  background-color: white;
}

.file-info {
  flex: 1;
}

.file-name-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.file-name {
  font-weight: 500;
  color: #374151;
}

.file-status {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  text-transform: capitalize;
}

.file-status.completed {
  color: #059669;
}

.file-status.error {
  color: #dc2626;
}

.file-status.processing {
  color: #2563eb;
}

.file-status.pending {
  color: #6b7280;
}

.file-details {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.file-error {
  color: #dc2626;
}

.file-actions {
  display: flex;
  gap: 0.5rem;
}

.processing-controls {
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 8px;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background-color: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.status-item .label {
  font-size: 0.875rem;
  color: #6b7280;
}

.status-item .value {
  font-weight: 600;
  font-size: 1.125rem;
}

.status-item .value.success {
  color: #059669;
}

.status-item .value.error {
  color: #dc2626;
}

.status-item .value.pending {
  color: #6b7280;
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.export-controls {
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 8px;
}

.checkbox-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  padding: 0.5rem;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.checkbox-item {
  padding: 0.25rem;
}

.export-buttons {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
}

.log-container {
  max-height: 220px;
  overflow: auto;
  background: #0b1020;
  border-radius: 6px;
  padding: 10px;
}

.log-content {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
  color: #cdd9e5;
  margin: 0;
  white-space: pre-wrap;
}

.file-preview {
  max-height: 70vh;
  overflow: hidden;
}

.code-preview {
  background-color: #f3f4f6;
  padding: 1rem;
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  overflow: auto;
  max-height: 60vh;
  white-space: pre-wrap;
  word-wrap: break-word;
}

@media (max-width: 768px) {
  .mode-selection {
    flex-direction: column;
  }
  
  .status-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .action-buttons,
  .export-buttons {
    flex-direction: column;
  }
  
  .file-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .file-actions {
    align-self: flex-end;
  }
}
</style>