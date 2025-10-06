import { useStorage } from '@vueuse/core';

export interface AIPreset {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic';
  baseUrl: string;
  model: string;
  temperature: number;
  system: string;
}

export function usePresetStore() {
  const presets = useStorage<AIPreset[]>('ai:presets', []);

  function save(p: Omit<AIPreset, 'id'>) {
    const id = crypto.randomUUID();
    presets.value.push({ id, ...p });
    return id;
  }

  function remove(id: string) {
    presets.value = presets.value.filter(p => p.id !== id);
  }

  function exportAll(): string {
    return JSON.stringify(presets.value, null, 2);
  }

  function importFrom(json: string) {
    const arr = JSON.parse(json);
    if (Array.isArray(arr)) presets.value = arr;
  }

  return { presets, save, remove, exportAll, importFrom };
}


