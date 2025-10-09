import { Terminal } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.linux-commands-memo.title'),
  path: '/linux-commands-memo',
  description: translate('tools.linux-commands-memo.description'),
  keywords: [
    'linux',
    'bash',
    'shell',
    'command',
    'terminal',
    'unix',
    'system',
    'admin',
    'cheatsheet',
    'memo',
    'reference',
    'commands',
    'cli',
    'server',
    'sysadmin',
  ],
  component: () => import('./linux-commands-memo.vue'),
  icon: Terminal,
});
