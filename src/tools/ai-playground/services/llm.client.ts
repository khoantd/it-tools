export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessageInput {
  role: ChatRole;
  content: string | any[]; // Support both text and multimodal content
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface ChatParams {
  model: string;
  temperature?: number;
  max_tokens?: number;
}

export interface StreamChunk {
  content?: string;
  done?: boolean;
  tool_calls?: ToolCall[];
}

export interface LLMClient {
  createChatCompletion(opts: {
    messages: ChatMessageInput[];
    params: ChatParams;
    tools?: ToolDefinition[];
    signal?: AbortSignal;
  }): AsyncIterable<StreamChunk>;
}

export interface OpenAIConfig {
  baseUrl: string; // e.g. https://api.openai.com/v1
  apiKey: string;
}

export class OpenAIClient implements LLMClient {
  constructor(private cfg: OpenAIConfig) {}

  async *createChatCompletion(opts: { messages: ChatMessageInput[]; params: ChatParams; tools?: ToolDefinition[]; signal?: AbortSignal }): AsyncIterable<StreamChunk> {
    const base = this.cfg.baseUrl.replace(/\/$/, '');
    // Ensure OpenAI-compatible base URLs include /v1 (LiteLLM often omits it)
    const apiBase = base.endsWith('/v1') ? base : `${base}/v1`;
    const url = `${apiBase}/chat/completions`;
    const body: any = {
      model: opts.params.model,
      temperature: opts.params.temperature,
      max_tokens: opts.params.max_tokens,
      stream: true,
      messages: opts.messages,
    };
    
    if (opts.tools && opts.tools.length > 0) {
      body.tools = opts.tools;
      body.tool_choice = 'auto';
    }
    
    // Debug logging
    console.log('LLM Request:', {
      url,
      body: JSON.stringify(body, null, 2),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.cfg.apiKey ? '***' : 'MISSING'}`,
      }
    });
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.cfg.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      console.error('LLM API Error:', {
        status: res.status,
        statusText: res.statusText,
        error: errorText,
        url,
        body: JSON.stringify(body, null, 2)
      });
      throw new Error(`OpenAI HTTP ${res.status}: ${errorText}`);
    }
    
    if (!res.body) throw new Error(`OpenAI HTTP ${res.status}: No response body`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        const s = line.trim();
        if (!s.startsWith('data:')) continue;
        const data = s.slice(5).trim();
        if (data === '[DONE]') {
          yield { done: true };
          continue;
        }
        try {
          const json = JSON.parse(data);
          const choice = json.choices?.[0];
          if (choice?.delta?.content) {
            yield { content: choice.delta.content };
          }
          if (choice?.delta?.tool_calls) {
            yield { tool_calls: choice.delta.tool_calls };
          }
        } catch {}
      }
    }
    yield { done: true };
  }
}

export interface AnthropicConfig {
  baseUrl: string; // e.g. https://api.anthropic.com/v1
  apiKey: string;
}

// Minimal Anthropic Messages API streaming client
export class AnthropicClient implements LLMClient {
  constructor(private cfg: AnthropicConfig) {}

  async *createChatCompletion(opts: { messages: ChatMessageInput[]; params: ChatParams; tools?: ToolDefinition[]; signal?: AbortSignal }): AsyncIterable<StreamChunk> {
    const url = `${this.cfg.baseUrl.replace(/\/$/, '')}/messages`;
    // Convert OpenAI-like messages to Anthropic: system separate + user/assistant turns
    const system = opts.messages.find(m => m.role === 'system')?.content;
    const rest = opts.messages.filter(m => m.role !== 'system');
    const body = {
      model: opts.params.model,
      system,
      messages: rest.map(m => ({ role: m.role, content: m.content })),
      max_tokens: opts.params.max_tokens ?? 1024,
      temperature: opts.params.temperature,
      stream: true,
    } as any;
    
    if (opts.tools && opts.tools.length > 0) {
      body.tools = opts.tools;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.cfg.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
    if (!res.ok || !res.body) throw new Error(`Anthropic HTTP ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        const s = line.trim();
        if (!s.startsWith('data:')) continue;
        const data = s.slice(5).trim();
        if (!data || data === '[DONE]') { yield { done: true }; continue; }
        try {
          const json = JSON.parse(data);
          // content_block_delta -> delta.text
          const delta: string | undefined = json.delta?.text || json.content_block_delta?.delta?.text;
          if (delta) yield { content: delta };
          
          // Handle tool use blocks (Anthropic's function calling)
          if (json.type === 'content_block_delta' && json.delta?.type === 'tool_use') {
            // For now, we'll handle this in the main loop
            // Anthropic's tool calling is more complex and would need additional handling
          }
        } catch {}
      }
    }
    yield { done: true };
  }
}

export type ProviderKind = 'openai' | 'anthropic' | 'litellm';

export interface ProviderConfig {
  kind: ProviderKind;
  baseUrl: string;
  apiKey: string;
}

export function makeClient(p: ProviderConfig): LLMClient {
  if (p.kind === 'anthropic') return new AnthropicClient({ baseUrl: p.baseUrl, apiKey: p.apiKey });
  // LiteLLM is OpenAI-compatible
  return new OpenAIClient({ baseUrl: p.baseUrl, apiKey: p.apiKey });
}


