<script setup lang="ts">
import { useStorage } from '@vueuse/core';
import { useValidation } from '@/composable/validation';
import { withDefaultOnError } from '@/utils/defaults';
import { useCopy } from '@/composable/copy';
import { 
  IconEye, 
  IconEyeOff, 
  IconFile, 
  IconCode, 
  IconCopy, 
  IconDownload, 
  IconUpload, 
  IconTrash, 
  IconColumns, 
  IconList, 
  IconMaximize, 
  IconArrowsMaximize 
} from '@tabler/icons-vue';

// TypeScript declaration for the n8n-demo web component
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'n8n-demo': {
        workflow?: string;
      };
    }
  }
}

const inputElement = ref<HTMLElement>();
const fileInputRef = ref<HTMLInputElement>();
const workflowJson = useStorage('n8n-workflow-visualizer:workflow-json', '');
const isComponentLoaded = ref(false);

// Layout state
const layoutMode = useStorage<'split' | 'stacked'>('n8n:layoutMode', 'split');
const leftPaneWidth = useStorage<number>('n8n:leftPaneWidth', 50); // percent
const isResizing = ref(false);

// UI state
const showLineNumbers = useStorage('n8n:showLineNumbers', false);
const selectedExample = ref('');
const isVisualizationMaximized = ref(false);
const isJsonAreaCollapsed = useStorage('n8n:jsonAreaCollapsed', true); // Collapsed by default

// Copy functionality
const { copy } = useCopy();

// Workflow examples library
const workflowExamples = [
  {
    id: 'simple',
    name: 'Simple HTTP Request',
    description: 'Basic workflow with HTTP request and data transformation',
    workflow: {
      nodes: [
        {
          id: '1',
          name: 'Start',
          type: 'n8n-nodes-base.start',
          typeVersion: 1,
          position: [100, 100],
          parameters: {},
        },
        {
          id: '2',
          name: 'HTTP Request',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 1,
          position: [300, 100],
          parameters: {
            url: 'https://api.example.com/data',
            method: 'GET',
          },
        },
        {
          id: '3',
          name: 'Set',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [500, 100],
          parameters: {
            values: {
              string: [
                {
                  name: 'message',
                  value: 'Hello from n8n!',
                },
              ],
            },
          },
        },
      ],
      connections: {
        Start: {
          main: [
            [
              {
                node: 'HTTP Request',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
        'HTTP Request': {
          main: [
            [
              {
                node: 'Set',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
      },
    },
  },
  {
    id: 'conditional',
    name: 'Conditional Logic',
    description: 'Workflow with conditional branching and multiple paths',
    workflow: {
      nodes: [
        {
          id: '1',
          name: 'Start',
          type: 'n8n-nodes-base.start',
          typeVersion: 1,
          position: [100, 200],
          parameters: {},
        },
        {
          id: '2',
          name: 'IF',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [300, 200],
          parameters: {
            conditions: {
              string: [
                {
                  value1: '={{ $json.status }}',
                  operation: 'equal',
                  value2: 'success',
                },
              ],
            },
          },
        },
        {
          id: '3',
          name: 'Success Handler',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [500, 100],
          parameters: {
            values: {
              string: [
                {
                  name: 'result',
                  value: 'Operation successful',
                },
              ],
            },
          },
        },
        {
          id: '4',
          name: 'Error Handler',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [500, 300],
          parameters: {
            values: {
              string: [
                {
                  name: 'result',
                  value: 'Operation failed',
                },
              ],
            },
          },
        },
      ],
      connections: {
        Start: {
          main: [
            [
              {
                node: 'IF',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
        IF: {
          main: [
            [
              {
                node: 'Success Handler',
                type: 'main',
                index: 0,
              },
            ],
            [
              {
                node: 'Error Handler',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
      },
    },
  },
  {
    id: 'webhook',
    name: 'Webhook Integration',
    description: 'Webhook trigger with data processing and response',
    workflow: {
      nodes: [
        {
          id: '1',
          name: 'Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [100, 200],
          parameters: {
            httpMethod: 'POST',
            path: 'process-data',
          },
        },
        {
          id: '2',
          name: 'Transform Data',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [300, 200],
          parameters: {
            values: {
              string: [
                {
                  name: 'processed_at',
                  value: '={{ new Date().toISOString() }}',
                },
                {
                  name: 'original_data',
                  value: '={{ $json }}',
                },
              ],
            },
          },
        },
        {
          id: '3',
          name: 'Respond to Webhook',
          type: 'n8n-nodes-base.respondToWebhook',
          typeVersion: 1,
          position: [500, 200],
          parameters: {
            respondWith: 'json',
            responseBody: '={{ { status: "success", data: $json } }}',
          },
        },
      ],
      connections: {
        Webhook: {
          main: [
            [
              {
                node: 'Transform Data',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
        'Transform Data': {
          main: [
            [
              {
                node: 'Respond to Webhook',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
      },
    },
  },
];

// Use the first example as default
const sampleWorkflow = workflowExamples[0].workflow;

const workflowJsonString = computed(() => {
  if (!workflowJson.value.trim()) {
    return JSON.stringify(sampleWorkflow, null, 2);
  }
  return workflowJson.value;
});

// Create a reactive key that changes when workflow changes to force n8n-demo re-render
const workflowUpdateCounter = ref(0);
const workflowKey = computed(() => {
  return `workflow-${workflowUpdateCounter.value}`;
});

// Watch for workflow changes and increment counter to force re-render
// Use debounced watch to prevent excessive re-renders while typing
watch(workflowJsonString, () => {
  // Only update if the workflow is valid to avoid unnecessary re-renders
  if (isValidWorkflow.value) {
    workflowUpdateCounter.value++;
  }
}, { flush: 'post' });

// Manual trigger for visualization update
const triggerVisualizationUpdate = () => {
  // Small delay to ensure content is processed
  nextTick(() => {
    workflowUpdateCounter.value++;
  });
};

const parsedWorkflow = computed(() => {
  return withDefaultOnError(() => {
    const parsed = JSON.parse(workflowJsonString.value);
    return parsed;
  }, null);
});

const isValidWorkflow = computed(() => {
  if (!parsedWorkflow.value) return false;
  return parsedWorkflow.value.nodes && parsedWorkflow.value.connections;
});

// Workflow statistics
const workflowStats = computed(() => {
  if (!parsedWorkflow.value) return null;
  const nodes = parsedWorkflow.value.nodes || [];
  const connections = parsedWorkflow.value.connections || {};
  const triggers = parsedWorkflow.value.triggers || [];
  
  let connectionCount = 0;
  Object.values(connections).forEach((nodeConnections: any) => {
    if (nodeConnections.main) {
      nodeConnections.main.forEach((output: any) => {
        connectionCount += output.length;
      });
    }
  });

  let triggerCount = 0;
  triggers.forEach((trigger: any) => {
    console.log(trigger);
    // if (trigger.name === 'manual') {
    //   triggerCount++;
    // }
    // if (trigger.name === 'cron') {
    //   triggerCount++;
    // }
    // if (trigger.name === 'webhook') {
    //   triggerCount++;
    // }
    // if (trigger.name === 'schedule') {
    //   triggerCount++;
    // }
    // if (trigger.name === 'api') {
    //   triggerCount++;
    // }
  });

  return {
    nodeCount: nodes.length,
    connectionCount,
    hasTrigger: triggers.length > 0,
  };
});

// Responsive layout
const isMobile = useMediaQuery('(max-width: 768px)');
const effectiveLayoutMode = computed(() => isMobile.value ? 'stacked' : layoutMode.value);


const workflowValidation = useValidation({
  source: workflowJsonString,
  rules: [
    {
      validator: (v) => v === '' || JSON.parse(v),
      message: 'Provided JSON is not valid.',
    },
    {
      validator: (v) => {
        if (!v.trim()) return true;
        const parsed = JSON.parse(v);
        return parsed.nodes && parsed.connections;
      },
      message: 'Workflow must contain "nodes" and "connections" properties.',
    },
  ],
});

// Load the n8n-demo component
onMounted(async () => {
  try {
    // Load the web component polyfills and the n8n-demo component
    const script1 = document.createElement('script');
    script1.src = 'https://cdn.jsdelivr.net/npm/@webcomponents/webcomponentsjs@2.0.0/webcomponents-loader.js';
    document.head.appendChild(script1);

    const script2 = document.createElement('script');
    script2.src = 'https://www.unpkg.com/lit@2.0.0-rc.2/polyfill-support.js';
    document.head.appendChild(script2);

    const script3 = document.createElement('script');
    script3.type = 'module';
    script3.src = 'https://cdn.jsdelivr.net/npm/@n8n_io/n8n-demo-component@latest/n8n-demo.bundled.js';
    document.head.appendChild(script3);

    // Wait for the component to be defined
    await customElements.whenDefined('n8n-demo');
    isComponentLoaded.value = true;
  } catch (error) {
    console.error('Failed to load n8n-demo component:', error);
  }
});

// Action functions
const loadSample = () => {
  workflowJson.value = JSON.stringify(sampleWorkflow, null, 2);
};

const loadExample = (exampleId: string) => {
  const example = workflowExamples.find(e => e.id === exampleId);
  if (example) {
    workflowJson.value = JSON.stringify(example.workflow, null, 2);
    selectedExample.value = exampleId;
  }
};

const clearWorkflow = () => {
  workflowJson.value = '';
  selectedExample.value = '';
};

const formatJson = () => {
  if (!workflowJson.value.trim()) return;
  try {
    const parsed = JSON.parse(workflowJson.value);
    workflowJson.value = JSON.stringify(parsed, null, 2);
  } catch (error) {
    // JSON is invalid, don't format
  }
};

const copyWorkflow = async () => {
  await copy(workflowJsonString.value);
};

const downloadWorkflow = () => {
  const blob = new Blob([workflowJsonString.value], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'n8n-workflow.json';
  a.click();
  URL.revokeObjectURL(url);
};

const uploadWorkflow = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target?.result as string;
    try {
      JSON.parse(content); // Validate JSON
      workflowJson.value = content;
    } catch (error) {
      // Handle invalid JSON
    }
  };
  reader.readAsText(file);
};

// Resizing functionality
function onGutterPointerDown(ev: PointerEvent) {
  isResizing.value = true;
  const startX = ev.clientX;
  const container = document.querySelector('.split-container') as HTMLElement | null;
  const startLeft = leftPaneWidth.value;
  
  const onMove = (e: PointerEvent) => {
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const pct = Math.max(30, Math.min(70, (px / rect.width) * 100));
    leftPaneWidth.value = Math.round(pct);
  };
  
  const onUp = () => {
    isResizing.value = false;
    window.removeEventListener('pointermove', onMove as any);
    window.removeEventListener('pointerup', onUp as any);
  };
  
  window.addEventListener('pointermove', onMove as any);
  window.addEventListener('pointerup', onUp as any);
}

function onGutterDoubleClick() {
  leftPaneWidth.value = 50;
}

// Visualization maximize functionality
const toggleVisualizationMaximize = () => {
  isVisualizationMaximized.value = !isVisualizationMaximized.value;
};

// JSON area collapse functionality
const toggleJsonAreaCollapse = () => {
  isJsonAreaCollapsed.value = !isJsonAreaCollapsed.value;
};

// Handle ESC key to exit fullscreen
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isVisualizationMaximized.value) {
    isVisualizationMaximized.value = false;
  }
};

// Add/remove keyboard event listener
watch(isVisualizationMaximized, (isMaximized) => {
  if (isMaximized) {
    document.addEventListener('keydown', handleKeydown);
  } else {
    document.removeEventListener('keydown', handleKeydown);
  }
});

// Cleanup on unmount
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div class="n8n-workflow-visualizer">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="toolbar-section">
        <n-select
          v-model:value="selectedExample"
          placeholder="Load Example"
          :options="workflowExamples.map(e => ({ label: e.name, value: e.id }))"
          @update:value="loadExample"
          clearable
          style="width: 200px"
        />
        <n-button @click="loadSample" type="primary" ghost>
          <template #icon>
            <n-icon><IconFile /></n-icon>
          </template>
          Sample
        </n-button>
      </div>

      <div class="toolbar-section">
        <n-button @click="formatJson" :disabled="!workflowJson.trim()">
          <template #icon>
            <n-icon><IconCode /></n-icon>
          </template>
          Format
        </n-button>
        <n-button @click="copyWorkflow" :disabled="!workflowJson.trim()">
          <template #icon>
            <n-icon><IconCopy /></n-icon>
          </template>
          Copy
        </n-button>
        <n-button @click="downloadWorkflow" :disabled="!workflowJson.trim()">
          <template #icon>
            <n-icon><IconDownload /></n-icon>
          </template>
          Download
        </n-button>
        <n-button @click="fileInputRef?.click()">
          <template #icon>
            <n-icon><IconUpload /></n-icon>
          </template>
          Upload
        </n-button>
        <n-button @click="clearWorkflow" :disabled="!workflowJson.trim()">
          <template #icon>
            <n-icon><IconTrash /></n-icon>
          </template>
          Clear
        </n-button>
      </div>

      <div class="toolbar-section">
        <n-button-group>
          <n-button 
            :type="effectiveLayoutMode === 'split' ? 'primary' : 'default'"
            @click="layoutMode = 'split'"
            :disabled="isMobile"
          >
            <template #icon>
              <n-icon><IconColumns /></n-icon>
            </template>
            Split
          </n-button>
          <n-button 
            :type="effectiveLayoutMode === 'stacked' ? 'primary' : 'default'"
            @click="layoutMode = 'stacked'"
          >
            <template #icon>
              <n-icon><IconList /></n-icon>
            </template>
            Stacked
          </n-button>
        </n-button-group>
      </div>
    </div>

    <!-- Workflow Stats -->
    <div v-if="workflowStats" class="workflow-stats">
      <n-badge :value="workflowStats.nodeCount" type="info">
        Nodes
      </n-badge>
      <n-badge :value="workflowStats.connectionCount" type="success">
        Connections
      </n-badge>
      <n-badge v-if="workflowStats.hasTrigger" type="warning">
        Has Trigger
      </n-badge>
    </div>

    <!-- Main Content -->
    <div v-if="effectiveLayoutMode === 'split'" class="split-container" :style="{ '--left': leftPaneWidth + '%'}">
      <!-- Left Pane: JSON Input -->
      <div class="left-pane">
        <c-card :title="`Workflow JSON ${isJsonAreaCollapsed ? '(Collapsed)' : '(Expanded)'}`">
          <!-- <template> -->
            <!-- <n-button-group size="small"> -->
              <n-button 
                @click="toggleJsonAreaCollapse" 
                size="small"
                :aria-label="isJsonAreaCollapsed ? 'Expand JSON area' : 'Collapse JSON area'"
                :title="isJsonAreaCollapsed ? 'Expand JSON area' : 'Collapse JSON area'"
                type="primary"
                ghost
              >
                {{ isJsonAreaCollapsed ? '👁️ Expand' : '👁️‍🗨️ Collapse' }}
              </n-button>
              <span style="margin-left: 8px;">ℹ️</span>
            <!-- </n-button> -->
          <!-- </template> -->
          
          <n-collapse-transition :show="!isJsonAreaCollapsed">
            <n-form-item
              :feedback="workflowValidation.message"
              :validation-status="workflowValidation.status"
            >
              <c-input-text
                ref="inputElement"
                v-model:value="workflowJson"
                placeholder="Paste your n8n workflow JSON here..."
                rows="20"
                multiline
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
                monospace
                @paste="triggerVisualizationUpdate"
                @blur="triggerVisualizationUpdate"
              />
            </n-form-item>
          </n-collapse-transition>
        </c-card>
      </div>

      <!-- Resize Gutter -->
      <div 
        class="gutter" 
        :class="{ active: isResizing }"
        @pointerdown="onGutterPointerDown"
        @dblclick="onGutterDoubleClick"
      />

      <!-- Right Pane: Visualization -->
      <div class="right-pane">
        <c-card title="Workflow Visualization">
          <!-- <template #header-extra> -->
            <n-button-group size="small">
              <n-button @click="formatJson" :disabled="!workflowJson.trim()" size="small">
                Format
              </n-button>
              <n-button @click="copyWorkflow" :disabled="!workflowJson.trim()" size="small">
                Copy
              </n-button>
              <n-button 
                @click="toggleVisualizationMaximize" 
                :disabled="!workflowJson.trim() || !isValidWorkflow" 
                size="small"
                :aria-label="isVisualizationMaximized ? 'Minimize visualization' : 'Maximize visualization'"
              >
                <!-- <template #icon> -->
                  <n-icon>
                    <IconMaximize v-if="!isVisualizationMaximized" />
                    <IconArrowsMaximize v-else />
                  </n-icon>
                <!-- </template> -->
              </n-button>
            </n-button-group>
          <!-- </template> -->

          <div class="workflow-container" :class="{ 'visualization-maximized': isVisualizationMaximized }">
            <div v-if="!isComponentLoaded" class="loading-container">
              <n-spin size="large" />
              <p class="mt-4 text-center text-gray-500">Loading n8n workflow visualizer...</p>
            </div>
            <div v-else-if="!workflowJson.trim()" class="empty-container">
              <n-empty description="No workflow loaded">
                <template #extra>
                  <n-button @click="loadSample">Load Sample Workflow</n-button>
                </template>
              </n-empty>
            </div>
            <div v-else-if="!isValidWorkflow" class="error-container">
              <n-alert type="warning" title="Invalid Workflow">
                Please provide a valid n8n workflow JSON with "nodes" and "connections" properties.
                <template #action>
                  <n-button @click="formatJson" size="small">Format JSON</n-button>
                </template>
              </n-alert>
            </div>
            <div v-else class="workflow-display">
              <n8n-demo :key="workflowKey" :workflow="workflowJsonString" />
            </div>
          </div>
        </c-card>
      </div>
    </div>

    <!-- Stacked Layout -->
    <div v-else class="stacked-container">
        <c-card :title="`Workflow JSON ${isJsonAreaCollapsed ? '(Collapsed)' : '(Expanded)'}`">
          <!-- <template #header-extra> -->
            <!-- <n-button-group size="small"> -->
              <n-button 
                @click="toggleJsonAreaCollapse" 
                size="small"
                :aria-label="isJsonAreaCollapsed ? 'Expand JSON area' : 'Collapse JSON area'"
                :title="isJsonAreaCollapsed ? 'Expand JSON area' : 'Collapse JSON area'"
                type="primary"
                ghost
              >
                {{ isJsonAreaCollapsed ? '👁️ Expand' : '👁️‍🗨️ Collapse' }}
              </n-button>
            <!-- </n-button-group> -->
          <!-- </template> -->
        
          <n-collapse-transition :show="!isJsonAreaCollapsed">
            <n-form-item
              :feedback="workflowValidation.message"
              :validation-status="workflowValidation.status"
            >
              <c-input-text
                ref="inputElement"
                v-model:value="workflowJson"
                placeholder="Paste your n8n workflow JSON here..."
                rows="15"
                multiline
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
                monospace
                @paste="triggerVisualizationUpdate"
                @blur="triggerVisualizationUpdate"
              />
            </n-form-item>
          </n-collapse-transition>
        </c-card>

      <c-card title="Workflow Visualization">
        <template #header-extra>
          <n-button-group size="small">
            <n-button 
              @click="toggleVisualizationMaximize" 
              :disabled="!workflowJson.trim() || !isValidWorkflow" 
              size="small"
              :aria-label="isVisualizationMaximized ? 'Minimize visualization' : 'Maximize visualization'"
            >
              <template #icon>
                <n-icon>
                  <IconFullscreen v-if="!isVisualizationMaximized" />
                  <IconFullscreenExit v-else />
                </n-icon>
              </template>
            </n-button>
          </n-button-group>
        </template>
        
        <div class="workflow-container" :class="{ 'visualization-maximized': isVisualizationMaximized }">
          <div v-if="!isComponentLoaded" class="loading-container">
            <n-spin size="large" />
            <p class="mt-4 text-center text-gray-500">Loading n8n workflow visualizer...</p>
          </div>
          <div v-else-if="!workflowJson.trim()" class="empty-container">
            <n-empty description="No workflow loaded">
              <template #extra>
                <n-button @click="loadSample">Load Sample Workflow</n-button>
              </template>
            </n-empty>
          </div>
          <div v-else-if="!isValidWorkflow" class="error-container">
            <n-alert type="warning" title="Invalid Workflow">
              Please provide a valid n8n workflow JSON with "nodes" and "connections" properties.
              <template #action>
                <n-button @click="formatJson" size="small">Format JSON</n-button>
              </template>
            </n-alert>
          </div>
          <div v-else class="workflow-display">
            <n8n-demo :key="workflowKey" :workflow="workflowJsonString" />
          </div>
        </div>
      </c-card>
    </div>

    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".json"
      style="display: none"
      @change="uploadWorkflow"
    />
  </div>
</template>

<style lang="less" scoped>
.n8n-workflow-visualizer {
  // Toolbar
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: var(--card-color);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    margin-bottom: 16px;
    flex-wrap: wrap;

    .toolbar-section {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: stretch;
      
      .toolbar-section {
        justify-content: center;
        flex-wrap: wrap;
      }
    }
  }

  // Workflow Stats
  .workflow-stats {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
    padding: 12px 16px;
    background: var(--card-color);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    align-items: center;

    .n-badge {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }

  // Split Layout
  .split-container {
    --left: 50%;
    display: grid;
    grid-template-columns: var(--left) 12px 1fr;
    gap: 0;
    min-height: 600px;
  }

  .left-pane, .right-pane {
    min-height: 600px;
    display: flex;
    flex-direction: column;
    transition: all 0.3s ease;
  }

  .left-pane.collapsed {
    min-height: auto;
  }

  // Collapse transition styling
  :deep(.n-collapse-transition) {
    overflow: hidden;
  }

  .gutter {
    position: relative;
    cursor: col-resize;
    background: var(--border-color);
    transition: background 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;

    &::before {
      content: '';
      position: absolute;
      width: 4px;
      height: 24px;
      border-radius: 2px;
      background: var(--text-color-3);
    }

    &:hover {
      background: var(--border-color-hover);
    }

    &.active {
      background: var(--primary-color);
    }
  }

  // Stacked Layout
  .stacked-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  // Workflow Container
  .workflow-container {
    min-height: 400px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 16px;
    background: var(--card-color);
    transition: all 0.3s ease;
  }

  // Maximized visualization state
  .workflow-container.visualization-maximized {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100vw;
    height: 100vh;
    min-height: 100vh;
    z-index: 10000;
    border-radius: 0;
    padding: 20px;
    background: var(--card-color);
    overflow: auto;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
  }

  .empty-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 300px;
  }

  .error-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
  }

  .workflow-display {
    min-height: 300px;
  }

  // Ensure the n8n-demo component takes full width
  :deep(n8n-demo) {
    width: 100%;
    height: 100%;
    min-height: 300px;
  }

  // Maximized state for n8n-demo component
  .workflow-container.visualization-maximized :deep(n8n-demo) {
    min-height: calc(100vh - 40px);
    height: calc(100vh - 40px);
  }

  // Responsive adjustments
  @media (max-width: 768px) {
    .split-container {
      grid-template-columns: 1fr;
      grid-template-rows: auto 12px auto;
    }

    .gutter {
      cursor: row-resize;
      height: 12px;
      width: 100%;

      &::before {
        width: 24px;
        height: 4px;
      }
    }
  }

  // Dark mode adjustments
  :global(.dark) {
    .toolbar {
      background: var(--card-color);
      border-color: var(--border-color);
    }

    .workflow-stats {
      background: var(--card-color);
      border-color: var(--border-color);
    }
  }
}
</style>
