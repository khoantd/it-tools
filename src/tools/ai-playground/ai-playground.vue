<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onBeforeUnmount } from 'vue';
import { useStorage } from '@vueuse/core';
import { NInput, NSelect, NInputNumber, NButton, NForm, NFormItem, NSwitch } from 'naive-ui';
import { IconChevronDown, IconChevronUp, IconSettings, IconApi, IconHistory, IconX, IconMenu2 } from '@tabler/icons-vue';
import { marked } from 'marked';
import { makeClient, type ProviderConfig, type ToolDefinition } from './services/llm.client';
import { usePresetStore } from './services/presets.store';

type ChatRole = 'system' | 'user' | 'assistant' | 'tool'; // 'tool' is used internally but converted to 'assistant' for API
interface ChatMessage { 
  id: string; 
  role: ChatRole; 
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'llm' | 'tool';
  action: 'request' | 'response' | 'error';
  data: any;
}

const providerKind = useStorage<'openai' | 'anthropic'>('ai:provider', 'openai');
const providerBaseUrl = useStorage('ai:providerBaseUrl', 'https://api.openai.com/v1');
const apiKey = useStorage('ai:apiKey', '');
const model = useStorage('ai:model', 'gpt-3.5-turbo');
const temperature = useStorage('ai:temperature', 0.7);
const systemPrompt = useStorage('ai:system', 'You are a helpful assistant.');

const messages = useStorage<ChatMessage[]>('ai:messages', []);
const input = ref('');
const isStreaming = ref(false);
const abortController = ref<AbortController | null>(null);

// Log state
const logs = useStorage<LogEntry[]>('ai:logs', []);
const logsExpanded = useStorage('ai:logsExpanded', false);

// Layout state
const settingsCollapsed = useStorage('ai:settingsCollapsed', false);
const activeSettingsTab = useStorage('ai:activeSettingsTab', 'provider');

// Tool integration state
const isProcessingToolCall = ref(false);

function add(role: ChatRole, content: string) {
  messages.value.push({ id: crypto.randomUUID(), role, content });
}

// Logging functions
function addLog(type: 'llm' | 'tool', action: 'request' | 'response' | 'error', data: any) {
  logs.value.push({
    id: crypto.randomUUID(),
    timestamp: new Date(),
    type,
    action,
    data
  });
}

function clearLogs() {
  logs.value = [];
}

function exportLogs() {
  const blob = new Blob([JSON.stringify(logs.value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ai-logs-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatTimestamp(date: Date) {
  return new Date(date).toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  });
}

function formatToolArgs(args: any) {
  if (!args) return '{}';
  try {
    const parsed = typeof args === 'string' ? JSON.parse(args) : args;
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    return String(args);
  }
}

async function send() {
  const text = input.value.trim();
  if (!text || isStreaming.value || isProcessingToolCall.value) return;
  if (!apiKey.value) {
    add('assistant', 'Missing API key.');
    return;
  }
  if (messages.value.length === 0 && systemPrompt.value) {
    add('system', systemPrompt.value);
  }
  add('user', text);
  input.value = '';
  
  await processConversation();
}

async function processConversation() {
  const assistantId = crypto.randomUUID();
  messages.value.push({ id: assistantId, role: 'assistant', content: '' });
  await continueConversation(assistantId);
}

async function continueConversation(assistantId: string) {
  isStreaming.value = true;
  abortController.value = new AbortController();
  
  try {
    const client = makeClient({ kind: providerKind.value, baseUrl: providerBaseUrl.value, apiKey: apiKey.value } as ProviderConfig);
    const requestMessages = messages.value.filter(m => m.id !== assistantId).map(m => {
      // For tool messages, we need to create a proper tool response structure
      if (m.role === 'tool') {
        return {
          role: 'tool' as const,
          content: m.content,
          tool_call_id: m.tool_call_id
        };
      }
      
      // For other messages, use as-is
      const message: any = { 
        role: m.role,
        content: m.content 
      };
      
      // Preserve tool_calls for assistant messages
      if (m.tool_calls) {
        message.tool_calls = m.tool_calls;
      }
      
      return message;
    });
    
    // No tool integration
    const tools: any[] | undefined = undefined;
    
    // Validate request messages
    const validMessages = requestMessages.filter(msg => {
      if (!msg.role || msg.content === undefined || msg.content === null) {
        console.warn('Invalid message:', msg);
        return false;
      }
      
      // Ensure content is a string
      if (typeof msg.content !== 'string') {
        console.warn('Message content is not a string:', msg);
        return false;
      }
      
      return true;
    });
    
    if (validMessages.length === 0) {
      throw new Error('No valid messages to send');
    }
    
    // Log LLM request
    console.log('Final messages being sent:', validMessages);
    console.log('Message structure check:', validMessages.map((msg: any, idx: number) => ({
      index: idx,
      role: msg.role,
      hasToolCalls: !!msg.tool_calls,
      hasToolCallId: !!msg.tool_call_id,
      toolCallIds: msg.tool_calls?.map((tc: any) => tc.id) || [],
      contentLength: msg.content?.length || 0,
      fullMessage: msg
    })));
    
    addLog('llm', 'request', {
      model: model.value,
      temperature: temperature.value,
      messages: validMessages,
      tools: 0
    });
    
    const stream = client.createChatCompletion({
      params: { model: model.value, temperature: temperature.value },
      messages: validMessages,
      tools: tools,
      signal: abortController.value.signal,
    });
    
    let fullResponse = '';
    let toolCalls: any[] = [];
    
    for await (const chunk of stream) {
      if (chunk.content) {
        fullResponse += chunk.content;
        const idx = messages.value.findIndex(m => m.id === assistantId);
        if (idx >= 0) messages.value[idx] = { ...messages.value[idx], content: messages.value[idx].content + chunk.content };
      }
      
      if (chunk.tool_calls && Array.isArray(chunk.tool_calls)) {
        toolCalls.push(...chunk.tool_calls);
      }
    }
    
    // Log LLM response
    addLog('llm', 'response', {
      model: model.value,
      response: fullResponse,
      toolCalls: toolCalls.length
    });
    
    // No tool call processing
    
  } catch (e: any) {
    const idx = messages.value.findIndex(m => m.id === assistantId);
    if (idx >= 0) messages.value[idx] = { ...messages.value[idx], content: messages.value[idx].content + `\n\n[Error] ${e?.message ?? e}` };
    
    // Log LLM error
    addLog('llm', 'error', {
      model: model.value,
      error: e?.message ?? e
    });
  } finally {
    isStreaming.value = false;
    abortController.value = null;
  }
}


function stop() {
  abortController.value?.abort();
}

function clearChat() {
  messages.value = [];
}

const canSend = computed(() => !!input.value.trim() && !!apiKey.value && !isStreaming.value && !isProcessingToolCall.value);

// auto-scroll messages
const messagesEl = ref<HTMLDivElement | null>(null);
watch(() => messages.value.length, async () => {
  await nextTick();
  const el = messagesEl.value;
  if (el) el.scrollTop = el.scrollHeight;
});

// presets
const { presets, save, remove, exportAll, importFrom } = usePresetStore();
function savePreset() {
  save({ name: `Preset ${new Date().toLocaleString()}`, provider: providerKind.value, baseUrl: providerBaseUrl.value, model: model.value, temperature: temperature.value, system: systemPrompt.value });
}
function loadPreset(id: string) {
  const p = presets.value.find(x => x.id === id);
  if (!p) return;
  providerKind.value = p.provider;
  providerBaseUrl.value = p.baseUrl;
  model.value = p.model;
  temperature.value = p.temperature;
  systemPrompt.value = p.system;
}
function exportPresets() {
  const blob = new Blob([exportAll()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'ai-presets.json'; a.click();
  URL.revokeObjectURL(url);
}
async function importPresets(ev: Event) {
  const f = (ev.target as HTMLInputElement).files?.[0];
  if (!f) return;
  const text = await f.text();
  importFrom(text);
  (ev.target as HTMLInputElement).value = '';
}

// markdown rendering and copy
function renderMarkdown(text: string) {
  try { return marked.parse(text); } catch { return text; }
}
async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); } catch {}
}

// attachments and slash commands
const attachments = ref<File[]>([]);

// Provider defaults and dynamic placeholders
const providerDefaults: Record<'openai' | 'anthropic' | 'litellm', { baseUrl: string; model: string }> = {
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-3.5-turbo' },
  anthropic: { baseUrl: 'https://api.anthropic.com/v1', model: 'claude-3-5-sonnet-20240620' },
  litellm: { baseUrl: 'http://localhost:4000', model: 'gpt-3.5-turbo' },
};
watch(providerKind, (next, prev) => {
  const prevDef = providerDefaults[prev];
  const nextDef = providerDefaults[next];
  // If user was still on previous defaults, migrate them to next defaults
  if (providerBaseUrl.value === prevDef.baseUrl) providerBaseUrl.value = nextDef.baseUrl;
  if (model.value === prevDef.model) model.value = nextDef.model;
});
const baseUrlPlaceholder = computed(() => providerDefaults[providerKind.value].baseUrl);
const modelPlaceholder = computed(() => providerDefaults[providerKind.value].model);
async function onAttach(ev: Event) {
  const files = Array.from((ev.target as HTMLInputElement).files || []);
  if (!files.length) return;
  attachments.value.push(...files);
  (ev.target as HTMLInputElement).value = '';
}
function removeAttachment(i: number) { attachments.value.splice(i, 1); }
function onInputKeyup() {
  if (!input.value.startsWith('/')) return;
  const cmd = input.value.slice(1).trim();
  if (cmd === 'clear') { clearChat(); input.value = ''; }
  else if (cmd.startsWith('system ')) { systemPrompt.value = cmd.slice(7); input.value = ''; }
  else if (cmd.startsWith('tool ')) {
    const rest = cmd.slice(5).trim();
    const space = rest.indexOf(' ');
    const name = space >= 0 ? rest.slice(0, space) : rest;
    const jsonStr = space >= 0 ? rest.slice(space + 1) : '{}';
    try {
      const args = JSON.parse(jsonStr || '{}');
      add('assistant', 'Tool functionality has been removed');
    } catch {
      add('assistant', 'Invalid JSON for /tool command');
    }
    input.value = '';
  }
}


function onMessagesClick(ev: MouseEvent) {
  const target = ev.target as HTMLElement;
  if (target && target.classList.contains('copy-code-btn')) {
    const pre = target.closest('.code-block-wrapper')?.querySelector('pre > code');
    const code = pre?.textContent || '';
    if (code) navigator.clipboard.writeText(code).catch(() => {});
  }
}
onMounted(() => { messagesEl.value?.addEventListener('click', onMessagesClick); });
onBeforeUnmount(() => { messagesEl.value?.removeEventListener('click', onMessagesClick); });

</script>

<template>
  <div class="ai-playground">
    <c-card :title="$t('tools.ai-playground.title')">
      <div class="layout-container">
        <!-- Chat Section -->
        <div class="chat-section" :class="{ 'full-width': settingsCollapsed }">
          <div class="messages" ref="messagesEl">
            <div v-for="m in messages" :key="m.id" class="msg" :class="[m.role, { 'tool-call': m.tool_calls, 'tool-result': m.role === 'tool' }]">
              <div class="role">
                {{ m.role }}
                <span v-if="m.tool_calls" class="tool-indicator">🔧</span>
                <span v-if="m.role === 'tool'" class="tool-indicator">⚙️</span>
              </div>
              
              <!-- Tool call message -->
              <div v-if="m.tool_calls" class="tool-calls">
                <div v-for="toolCall in m.tool_calls" :key="toolCall.id" class="tool-call">
                  <div class="tool-name">🔧 {{ toolCall.function?.name || 'Unknown Tool' }}</div>
                  <div class="tool-args">{{ formatToolArgs(toolCall.function?.arguments) }}</div>
                </div>
              </div>
              
              <!-- Tool result -->
              <div v-else-if="m.role === 'tool'" class="tool-result">
                <pre>{{ m.content }}</pre>
              </div>
              
              <!-- Regular content -->
              <div v-else class="content">
                <div v-if="m.role !== 'assistant'" v-text="m.content"></div>
                <div v-else v-html="renderMarkdown(m.content)"></div>
              </div>
              
              <div v-if="m.role === 'assistant' && m.content && !m.tool_calls" class="msg-actions">
                <NButton size="tiny" quaternary @click="copy(m.content)">Copy</NButton>
              </div>
            </div>
          </div>
          <div class="composer">
            <NInput v-model:value="input" @keyup="onInputKeyup" type="textarea" :autosize="{ minRows: 3, maxRows: 8 }" :placeholder="$t('tools.ai-playground.input')" />
            <div class="attachments" v-if="attachments.length">
              <div class="att-item" v-for="(f, i) in attachments" :key="i">
                <span class="att-name">{{ f.name }}</span>
                <NButton size="tiny" quaternary @click="removeAttachment(i)">x</NButton>
              </div>
            </div>
            <div class="attach-row">
              <label class="import-label">
                <NButton quaternary size="small">Attach files</NButton>
                <input type="file" multiple accept="text/plain,image/*" @change="onAttach" hidden />
              </label>
              <span class="att-count" v-if="attachments.length">{{ attachments.length }} selected</span>
            </div>
            <div class="actions">
              <NButton type="primary" :disabled="!canSend || isProcessingToolCall" @click="send">
                <span v-if="isStreaming">Streaming...</span>
                <span v-else-if="isProcessingToolCall">Using Tools...</span>
                <span v-else>{{ $t('tools.ai-playground.actions.send') }}</span>
              </NButton>
              <NButton :disabled="!isStreaming && !isProcessingToolCall" @click="stop">{{ $t('tools.ai-playground.actions.stop') }}</NButton>
              <NButton quaternary @click="clearChat">{{ $t('tools.ai-playground.actions.clear') }}</NButton>
            </div>
          </div>
        </div>

        <!-- Settings Section -->
        <div class="settings-section" :class="{ 'collapsed': settingsCollapsed }">
          <!-- Settings Toggle Button -->
          <div class="settings-toggle">
            <NButton 
              quaternary 
              size="small" 
              @click="settingsCollapsed = !settingsCollapsed"
              :title="settingsCollapsed ? 'Show Settings' : 'Hide Settings'"
            >
              <n-icon size="16">
                <IconMenu2 v-if="settingsCollapsed" />
                <IconX v-else />
              </n-icon>
            </NButton>
          </div>

          <!-- Settings Content -->
          <div v-if="!settingsCollapsed" class="settings-content">
            <!-- Settings Tabs -->
            <div class="settings-tabs">
              <button 
                class="tab-button" 
                :class="{ active: activeSettingsTab === 'provider' }"
                @click="activeSettingsTab = 'provider'"
              >
                <n-icon size="16"><IconApi /></n-icon>
                Provider
              </button>
              <button 
                class="tab-button" 
                :class="{ active: activeSettingsTab === 'history' }"
                @click="activeSettingsTab = 'history'"
              >
                <n-icon size="16"><IconHistory /></n-icon>
                History
              </button>
            </div>

            <!-- Tab Content -->
            <div class="tab-content">
              <!-- Provider Settings Tab -->
              <div v-if="activeSettingsTab === 'provider'" class="settings-panel">
                <div class="section-header">
                  <h3>API Configuration</h3>
                </div>
                <NForm label-placement="top" :show-require-mark="false">
                  <NFormItem label="Provider">
                    <NSelect v-model:value="providerKind" :options="[
                      { label: 'OpenAI-compatible', value: 'openai' },
                      { label: 'Anthropic', value: 'anthropic' },
                      { label: 'LiteLLM (OpenAI-compatible)', value: 'litellm' }
                    ]" />
                  </NFormItem>
                  <NFormItem :label="$t('tools.ai-playground.settings.baseUrl')">
                    <NInput v-model:value="providerBaseUrl" :placeholder="baseUrlPlaceholder" />
                  </NFormItem>
                  <NFormItem :label="$t('tools.ai-playground.settings.apiKey')">
                    <NInput v-model:value="apiKey" type="password" placeholder="Enter API key" />
                  </NFormItem>
                  <NFormItem :label="$t('tools.ai-playground.settings.model')">
                    <NInput v-model:value="model" :placeholder="modelPlaceholder" />
                  </NFormItem>
                  <NFormItem :label="$t('tools.ai-playground.settings.temperature')">
                    <NInputNumber v-model:value="temperature" :min="0" :max="2" :step="0.1" />
                  </NFormItem>
                  <NFormItem :label="$t('tools.ai-playground.settings.system')">
                    <NInput v-model:value="systemPrompt" type="textarea" :autosize="{ minRows: 3, maxRows: 8 }" />
                  </NFormItem>
                </NForm>

                <div class="section-header">
                  <h3>Presets</h3>
                </div>
                <div class="preset-actions">
                  <NButton @click="savePreset" type="primary" tertiary>Save preset</NButton>
                  <NButton @click="exportPresets" quaternary>Export</NButton>
                  <label class="import-label">
                    Import
                    <input type="file" accept="application/json" @change="importPresets" hidden />
                  </label>
                </div>
                
                <div v-if="presets.length" class="preset-list">
                  <div class="preset-item" v-for="p in presets" :key="p.id">
                    <div class="preset-name">{{ p.name }}</div>
                    <div class="preset-buttons">
                      <NButton size="small" @click="loadPreset(p.id)">Load</NButton>
                      <NButton size="small" quaternary @click="remove(p.id)">Remove</NButton>
                    </div>
                  </div>
                </div>
              </div>


              <!-- History Settings Tab -->
              <div v-if="activeSettingsTab === 'history'" class="settings-panel">
                <div class="section-header">
                  <h3>Interaction Logs</h3>
                </div>
                <div class="log-panel">
                  <div class="log-header" @click="logsExpanded = !logsExpanded">
                    <span>Logs ({{ logs.length }})</span>
                    <div class="log-actions">
                      <NButton size="tiny" quaternary @click.stop="exportLogs">Export</NButton>
                      <NButton size="tiny" quaternary @click.stop="clearLogs">Clear</NButton>
                      <n-icon size="16">
                        <IconChevronDown v-if="!logsExpanded" />
                        <IconChevronUp v-else />
                      </n-icon>
                    </div>
                  </div>
                  <transition name="collapse">
                    <div v-show="logsExpanded" class="log-body">
                      <div v-for="log in logs.slice().reverse()" :key="log.id" class="log-entry" :class="[log.type, log.action]">
                        <div class="log-timestamp">{{ formatTimestamp(log.timestamp) }}</div>
                        <div class="log-type">{{ log.type.toUpperCase() }} - {{ log.action }}</div>
                        <pre class="log-data">{{ JSON.stringify(log.data, null, 2) }}</pre>
                      </div>
                      <div v-if="!logs.length" class="log-empty">No logs yet</div>
                    </div>
                  </transition>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </c-card>
  </div>
</template>

<style scoped>
/* Main Layout */
.ai-playground { 
  max-width: 1400px; 
  margin: 0 auto; 
  padding: 0 16px;
}

.layout-container {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 20px;
  min-height: 600px;
}

/* Chat Section */
.chat-section {
  display: flex;
  flex-direction: column;
  min-height: 600px;
}

.chat-section.full-width {
  grid-column: 1 / -1;
}

.messages { 
  background: #fff; 
  border: 1px solid #e5e7eb; 
  border-radius: 12px; 
  padding: 16px; 
  flex: 1;
  min-height: 400px; 
  max-height: 70vh; 
  overflow: auto;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.msg { 
  padding: 12px 16px; 
  border-radius: 8px; 
  margin-bottom: 12px; 
  white-space: pre-wrap;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.msg:hover {
  border-color: #e5e7eb;
}

.msg.user { 
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); 
  border-left: 4px solid #3b82f6;
}

.msg.assistant { 
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); 
  border-left: 4px solid #10b981;
}

.msg.system { 
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); 
  font-style: italic;
  border-left: 4px solid #6b7280;
}

.msg.tool { 
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); 
  border-left: 4px solid #0ea5e9;
}

.msg.tool-call { 
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); 
  border-left: 4px solid #f59e0b;
}

.msg .role { 
  font-size: 11px; 
  color: #6b7280; 
  margin-bottom: 6px; 
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.msg-actions { 
  margin-top: 8px; 
  opacity: 0;
  transition: opacity 0.2s ease;
}

.msg:hover .msg-actions {
  opacity: 1;
}

.tool-indicator {
  margin-left: 8px;
  font-size: 12px;
}

.tool-calls {
  margin-top: 8px;
}

.tool-call {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 8px;
}

.tool-name {
  font-weight: 600;
  color: #374151;
  margin-bottom: 4px;
}

.tool-args {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 11px;
  color: #6b7280;
  background: #f9fafb;
  padding: 6px;
  border-radius: 4px;
  white-space: pre-wrap;
}

.tool-result {
  margin-top: 8px;
}

.tool-result pre {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px;
  font-size: 12px;
  color: #374151;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.composer { 
  margin-top: 16px; 
  display: grid; 
  gap: 12px; 
}

.composer textarea { 
  width: 100%; 
  border: 2px solid #e5e7eb; 
  border-radius: 12px; 
  padding: 12px 16px; 
  min-height: 100px;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.composer textarea:focus {
  border-color: #3b82f6;
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.composer .actions { 
  display: flex; 
  gap: 12px; 
  justify-content: flex-end;
}

.attachments { 
  display: flex; 
  gap: 8px; 
  flex-wrap: wrap; 
}

.att-item { 
  display: inline-flex; 
  align-items: center; 
  gap: 6px; 
  background: #f3f4f6; 
  border: 1px solid #e5e7eb; 
  border-radius: 20px; 
  padding: 6px 12px; 
  font-size: 12px;
}

.attach-row { 
  display: flex; 
  justify-content: space-between; 
  align-items: center;
}

/* Settings Section */
.settings-section {
  display: flex;
  flex-direction: column;
  background: #fafafa;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  transition: all 0.3s ease;
}

.settings-section.collapsed {
  width: 60px;
}

.settings-toggle {
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
}

.settings-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Settings Tabs */
.settings-tabs {
  display: flex;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.tab-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  transition: all 0.2s ease;
  border-bottom: 2px solid transparent;
}

.tab-button:hover {
  background: #f9fafb;
  color: #374151;
}

.tab-button.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
  background: #f9fafb;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.settings-panel {
  display: grid;
  gap: 16px;
}

.section-header {
  margin-bottom: 8px;
}

.section-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Form Elements */
.preset-actions { 
  display: flex; 
  gap: 8px; 
  align-items: center; 
  flex-wrap: wrap;
}

.import-label { 
  display: inline-flex; 
  align-items: center; 
  gap: 6px; 
  cursor: pointer; 
}

.preset-list { 
  display: grid; 
  gap: 8px; 
}

.preset-item { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding: 8px 12px; 
  border: 1px solid #e5e7eb; 
  border-radius: 8px; 
  background: #fff;
  transition: all 0.2s ease;
}

.preset-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.preset-name { 
  font-size: 12px; 
  color: #374151; 
  font-weight: 500;
}

.preset-buttons {
  display: flex;
  gap: 4px;
}

/* MCP Panel */
.mcp-panel { 
  border: 1px dashed #e5e7eb; 
  border-radius: 8px; 
  padding: 12px; 
  background: #fff;
}

.mcp-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 12px; 
  font-weight: 500;
}

.mcp-body { 
  display: grid; 
  gap: 12px; 
}

/* Log Panel */
.log-panel { 
  border: 1px solid #e5e7eb; 
  border-radius: 8px; 
  padding: 12px; 
  background: #fff; 
}

.log-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  cursor: pointer; 
  user-select: none; 
  font-weight: 500;
}

.log-actions { 
  display: flex; 
  gap: 4px; 
  align-items: center; 
}

.log-body { 
  margin-top: 12px; 
  max-height: 300px; 
  overflow-y: auto; 
  display: grid; 
  gap: 8px; 
}

.log-entry { 
  padding: 10px; 
  border: 1px solid #e5e7eb; 
  border-radius: 6px; 
  background: #fff; 
  font-size: 11px; 
}

.log-entry.llm { 
  border-left: 3px solid #3b82f6; 
}

.log-entry.tool { 
  border-left: 3px solid #10b981; 
}

.log-entry.error { 
  background: #fef2f2; 
  border-left-color: #ef4444; 
}

.log-timestamp { 
  color: #6b7280; 
  font-size: 10px; 
  margin-bottom: 4px; 
}

.log-type { 
  font-weight: 600; 
  color: #374151; 
  margin-bottom: 6px; 
  text-transform: uppercase; 
}

.log-data { 
  background: #f9fafb; 
  padding: 8px; 
  border-radius: 4px; 
  overflow-x: auto; 
  white-space: pre-wrap; 
  word-break: break-all; 
  margin: 0; 
  font-size: 10px;
}

.log-empty { 
  text-align: center; 
  color: #9ca3af; 
  padding: 20px; 
}

/* Responsive Design */
@media (max-width: 1024px) {
  .layout-container {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .settings-section {
    order: -1;
  }
  
  .settings-section.collapsed {
    width: 100%;
    height: 60px;
  }
  
  .settings-content {
    position: absolute;
    top: 60px;
    left: 0;
    right: 0;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 0 0 12px 12px;
    z-index: 10;
    max-height: 60vh;
    overflow-y: auto;
  }
}

@media (max-width: 768px) {
  .ai-playground {
    padding: 0 8px;
  }
  
  .messages {
    padding: 12px;
    border-radius: 8px;
  }
  
  .composer textarea {
    min-height: 80px;
    padding: 10px 12px;
  }
  
  .composer .actions {
    flex-direction: column;
    gap: 8px;
  }
  
  .tab-button {
    padding: 10px 6px;
    font-size: 11px;
  }
}
</style>


