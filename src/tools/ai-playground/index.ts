import { Message2 } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.ai-playground.title'),
  path: '/ai-playground',
  description: translate('tools.ai-playground.description'),
  keywords: ['ai', 'chat', 'llm', 'mcp', 'openai', 'anthropic', 'playground'],
  component: () => import('./ai-playground.vue'),
  icon: Message2,
  createdAt: new Date(),
});


