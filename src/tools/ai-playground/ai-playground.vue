<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onBeforeUnmount } from 'vue';
import { useStorage } from '@vueuse/core';
import { NInput, NSelect, NInputNumber, NButton, NForm, NFormItem, NSwitch } from 'naive-ui';
import { marked } from 'marked';
import { makeClient, type ProviderConfig } from './services/llm.client';
import { usePresetStore } from './services/presets.store';
import { McpClient } from './services/mcp.client';

type ChatRole = 'system' | 'user' | 'assistant';
interface ChatMessage { id: string; role: ChatRole; content: string }

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

function add(role: ChatRole, content: string) {
  messages.value.push({ id: crypto.randomUUID(), role, content });
}

async function send() {
  const text = input.value.trim();
  if (!text || isStreaming.value) return;
  if (!apiKey.value) {
    add('assistant', 'Missing API key.');
    return;
  }
  if (messages.value.length === 0 && systemPrompt.value) {
    add('system', systemPrompt.value);
  }
  add('user', text);
  input.value = '';
  const assistantId = crypto.randomUUID();
  messages.value.push({ id: assistantId, role: 'assistant', content: '' });

  isStreaming.value = true;
  abortController.value = new AbortController();
  try {
    const client = makeClient({ kind: providerKind.value, baseUrl: providerBaseUrl.value, apiKey: apiKey.value } as ProviderConfig);
    const stream = client.createChatCompletion({
      params: { model: model.value, temperature: temperature.value },
      messages: messages.value.filter(m => m.id !== assistantId).map(m => ({ role: m.role, content: m.content })),
      signal: abortController.value.signal,
    });
    for await (const chunk of stream) {
      if (chunk.content) {
        const idx = messages.value.findIndex(m => m.id === assistantId);
        if (idx >= 0) messages.value[idx] = { ...messages.value[idx], content: messages.value[idx].content + chunk.content };
      }
    }
  } catch (e: any) {
    const idx = messages.value.findIndex(m => m.id === assistantId);
    if (idx >= 0) messages.value[idx] = { ...messages.value[idx], content: messages.value[idx].content + `\n\n[Error] ${e?.message ?? e}` };
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

const canSend = computed(() => !!input.value.trim() && !!apiKey.value && !isStreaming.value);

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
const mcp = new McpClient();
const mcpEnabled = useStorage('ai:mcpEnabled', false);
const mcpTools = ref<{ label: string; value: string }[]>([]);
const mcpSelectedTool = ref<string | null>(null);
const mcpToolArgs = ref<string>('{}');

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
      callTool(name, args);
    } catch {
      add('assistant', 'Invalid JSON for /tool command');
    }
    input.value = '';
  }
}

async function callTool(name: string, args: unknown) {
  add('user', `/tool ${name} ${JSON.stringify(args)}`);
  const assistantId = crypto.randomUUID();
  messages.value.push({ id: assistantId, role: 'assistant', content: '' });
  try {
    const res = await mcp.callTool(name, args);
    const idx = messages.value.findIndex(m => m.id === assistantId);
    if (idx >= 0) messages.value[idx] = { ...messages.value[idx], content: `Tool ${name} result:\n\n\`\`\`json\n${res.output}\n\`\`\`` };
  } catch (e: any) {
    const idx = messages.value.findIndex(m => m.id === assistantId);
    if (idx >= 0) messages.value[idx] = { ...messages.value[idx], content: `Tool ${name} failed: ${e?.message ?? e}` };
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

// Load MCP tools when enabled
watch(mcpEnabled, async (val) => {
  if (!val) return;
  const tools = await mcp.listTools();
  mcpTools.value = tools.map(t => ({ label: t.name, value: t.name }));
  if (!mcpSelectedTool.value && mcpTools.value.length) mcpSelectedTool.value = mcpTools.value[0].value;
}, { immediate: true });
</script>

<template>
  <div class="ai-playground">
    <c-card :title="$t('tools.ai-playground.title')">
      <div class="grid grid-cols-1 gap-6px lg:grid-cols-6">
        <div class="lg:col-span-3">
          <div class="messages" ref="messagesEl">
            <div v-for="m in messages" :key="m.id" class="msg" :class="m.role">
              <div class="role">{{ m.role }}</div>
              <div class="content" v-if="m.role !== 'assistant'">{{ m.content }}</div>
              <div class="content" v-else v-html="renderMarkdown(m.content)"></div>
              <div v-if="m.role === 'assistant' && m.content" class="msg-actions">
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
              <NButton type="primary" :disabled="!canSend" @click="send">{{ $t('tools.ai-playground.actions.send') }}</NButton>
              <NButton :disabled="!isStreaming" @click="stop">{{ $t('tools.ai-playground.actions.stop') }}</NButton>
              <NButton quaternary @click="clearChat">{{ $t('tools.ai-playground.actions.clear') }}</NButton>
            </div>
          </div>
        </div>
        <div class="lg:col-span-3">
          <div class="panel">
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

            <div class="preset-actions">
              <NButton @click="savePreset" type="primary" tertiary>Save preset</NButton>
              <NButton @click="exportPresets" quaternary>Export</NButton>
              <label class="import-label">
                Import
                <input type="file" accept="application/json" @change="importPresets" hidden />
              </label>
            </div>

            <div class="mcp-panel">
              <div class="mcp-header">
                <span>MCP tools</span>
                <NSwitch v-model:value="mcpEnabled" />
              </div>
              <div v-if="mcpEnabled" class="mcp-body">
                <NSelect v-model:value="mcpSelectedTool" :options="mcpTools" placeholder="Select tool" />
                <NInput v-model:value="mcpToolArgs" type="textarea" :autosize="{ minRows: 2, maxRows: 6 }" placeholder='{"text": "hello"}' />
                <NButton size="small" @click="() => mcpSelectedTool && callTool(mcpSelectedTool, JSON.parse(mcpToolArgs || '{}'))">Run tool</NButton>
              </div>
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
        </div>
      </div>
    </c-card>
  </div>
</template>

<style scoped>
.ai-playground { max-width: 1200px; margin: 0 auto; }
.messages { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; min-height: 360px; max-height: 60vh; overflow: auto; }
.msg { padding: 8px 10px; border-radius: 6px; margin-bottom: 8px; white-space: pre-wrap; }
.msg.user { background: #eff6ff; }
.msg.assistant { background: #f9fafb; }
.msg.system { background: #f3f4f6; font-style: italic; }
.msg .role { font-size: 12px; color: #6b7280; margin-bottom: 4px; text-transform: capitalize; }
.msg-actions { margin-top: 4px; }
.composer { margin-top: 10px; display: grid; gap: 8px; }
.composer textarea, .panel textarea { width: 100%; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; }
.composer textarea { min-height: 90px; }
.composer .actions { display: flex; gap: 8px; }
.attachments { display: flex; gap: 8px; flex-wrap: wrap; }
.att-item { display: inline-flex; align-items: center; gap: 6px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 999px; padding: 4px 8px; }
.att-name { font-size: 12px; }
.attach-row { display: flex; justify-content: flex-end; }
.panel { display: grid; gap: 6px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #fff; }
.panel input { width: 100%; border: 1px solid #e5e7eb; border-radius: 6px; padding: 6px; }
.panel select { width: 100%; border: 1px solid #e5e7eb; border-radius: 6px; padding: 6px; }
.panel textarea { width: 100%; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; }
.preset-actions { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
.import-label { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.preset-list { margin-top: 8px; display: grid; gap: 6px; }
.preset-item { display: flex; justify-content: space-between; align-items: center; padding: 6px; border: 1px solid #e5e7eb; border-radius: 6px; }
.preset-name { font-size: 12px; color: #374151; }
label { font-size: 12px; color: #6b7280; }
.mcp-panel { margin-top: 12px; border: 1px dashed #e5e7eb; border-radius: 8px; padding: 10px; }
.mcp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.mcp-body { display: grid; gap: 8px; }
</style>


