export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessageInput {
  role: ChatRole;
  content: string;
}

export interface ChatParams {
  model: string;
  temperature?: number;
  max_tokens?: number;
}

export interface StreamChunk {
  content?: string;
  done?: boolean;
}

export interface LLMClient {
  createChatCompletion(opts: {
    messages: ChatMessageInput[];
    params: ChatParams;
    signal?: AbortSignal;
  }): AsyncIterable<StreamChunk>;
}

export interface OpenAIConfig {
  baseUrl: string; // e.g. https://api.openai.com/v1
  apiKey: string;
}

export class OpenAIClient implements LLMClient {
  constructor(private cfg: OpenAIConfig) {}

  async *createChatCompletion(opts: { messages: ChatMessageInput[]; params: ChatParams; signal?: AbortSignal }): AsyncIterable<StreamChunk> {
    const url = `${this.cfg.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: opts.params.model,
        temperature: opts.params.temperature,
        max_tokens: opts.params.max_tokens,
        stream: true,
        messages: opts.messages,
      }),
      signal: opts.signal,
    });
    if (!res.ok || !res.body) throw new Error(`OpenAI HTTP ${res.status}`);
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
          const delta: string | undefined = json.choices?.[0]?.delta?.content;
          if (delta) yield { content: delta };
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

  async *createChatCompletion(opts: { messages: ChatMessageInput[]; params: ChatParams; signal?: AbortSignal }): AsyncIterable<StreamChunk> {
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


