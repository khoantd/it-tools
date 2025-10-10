import { GitBranch } from '@vicons/tabler';
import { defineTool } from '../tool';

export const tool = defineTool({
  name: 'n8n Workflow Visualizer',
  path: '/n8n-workflow-visualizer',
  description: 'Visualize n8n workflows from JSON. Paste your n8n workflow JSON to see it rendered as an interactive workflow diagram.',
  keywords: ['n8n', 'workflow', 'visualizer', 'automation', 'json', 'converter'],
  component: () => import('./n8n-workflow-visualizer.vue'),
  icon: GitBranch,
});
