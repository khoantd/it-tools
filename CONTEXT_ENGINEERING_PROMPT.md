# IT-Tools Project Context Engineering Prompt

## Project Overview

**IT-Tools** is a comprehensive web application providing 310+ developer and IT utility tools. It's a Vue 3 SPA with modern architecture, multi-language support, and PWA capabilities.

**Live Site**: https://it-tools.tech  
**Repository**: https://github.com/CorentinTh/it-tools  
**License**: GNU GPLv3

## Tech Stack

### Core Technologies
- **Frontend**: Vue 3 (Composition API) + TypeScript
- **UI Library**: Naive UI + Custom component library
- **Styling**: UnoCSS (utility-first CSS)
- **State Management**: Pinia
- **Routing**: Vue Router 4
- **Build Tool**: Vite
- **Package Manager**: pnpm
- **Testing**: Vitest (unit) + Playwright (E2E)

### Key Dependencies
- **Icons**: @tabler/icons-vue, @vicons/material
- **Utilities**: @vueuse/core, lodash, date-fns
- **Crypto**: crypto-js, bcryptjs, node-forge
- **Data Processing**: mathjs, marked, highlight.js
- **Internationalization**: vue-i18n

## Architecture Patterns

### 1. Tool System Architecture
```typescript
// Each tool follows this pattern:
interface Tool {
  name: string           // Display name
  path: string          // URL route
  description: string   // Tool description
  keywords: string[]    // Search keywords
  component: () => Promise<Component>  // Lazy-loaded Vue component
  icon: Component       // Tabler icon component
  redirectFrom?: string[]  // Legacy URL redirects
  isNew: boolean        // Auto-calculated from createdAt
}
```

### 2. Component Organization
```
src/
├── components/         # Shared UI components
├── composable/         # Vue composables (reusable logic)
├── layouts/           # Layout components (base, tool)
├── pages/             # Route pages
├── plugins/           # Vue plugins (i18n, naive, analytics)
├── stores/            # Pinia stores
├── tools/             # Individual tool implementations
├── ui/                # Custom UI component library
└── utils/             # Pure utility functions
```

### 3. Tool Categories (10 total)
- **Crypto**: Encryption, hashing, JWT, certificates
- **Converter**: Data format conversions (JSON, YAML, XML, etc.)
- **Web**: URL utilities, HTML entities, HTTP status codes
- **Images/Videos**: QR codes, SVG generators, camera recorder
- **Development**: Git, Docker, regex, SQL formatters
- **Network**: IP calculators, MAC address tools
- **Math**: Mathematical calculations and evaluators
- **Measurement**: Time, temperature, benchmarks
- **Text**: Text processing, statistics, obfuscation
- **Data**: Phone/IBAN validation, parsing

## Development Guidelines

### 1. Creating New Tools
```bash
# Use the automated script
pnpm run script:create:tool my-tool-name
```

**Manual Process:**
1. Create directory: `src/tools/my-tool-name/`
2. Add `index.ts` with tool definition
3. Add `my-tool-name.vue` component
4. Import in `src/tools/index.ts`
5. Add to appropriate category
6. Add translations to `locales/*.yml`

### 2. Tool Component Structure
```vue
<script setup lang="ts">
// Tool logic here
const input = ref('');
const output = computed(() => {
  // Processing logic
});
</script>

<template>
  <div class="tool-container">
    <c-card title="Input">
      <c-input-text v-model="input" />
    </c-card>
    
    <c-card title="Output">
      <c-text-copyable :value="output" />
    </c-card>
  </div>
</template>
```

### 3. Custom UI Components
- Located in `src/ui/`
- Follow naming: `c-component-name`
- Include theme files: `c-component-name.theme.ts`
- Include demo files: `c-component-name.demo.vue`
- Use CSS-in-JS with `v-bind()` for dynamic theming

### 4. Internationalization
```yaml
# locales/en.yml
tools:
  my-tool:
    title: "My Tool"
    description: "Tool description"
```

```typescript
// In tool definition
name: translate('tools.my-tool.title'),
description: translate('tools.my-tool.description'),
```

## Configuration

### Environment Variables
```bash
# Build-time variables
VITE_VERCEL_ENV=production|development|preview|test
VITE_VERCEL_GIT_COMMIT_SHA=abc123
BASE_URL=/
VITE_TRACKER_ENABLED=true
VITE_PLAUSIBLE_DOMAIN=it-tools.tech
VITE_SHOW_BANNER=false
```

### Vite Configuration
- **Auto-imports**: Vue, Vue Router, VueUse, Naive UI composables
- **Component Auto-registration**: Custom components and icons
- **PWA**: Service worker with auto-update
- **TypeScript**: Strict mode with vue-tsc

## State Management

### Pinia Stores
```typescript
// src/stores/style.store.ts
export const useStyleStore = defineStore('style', {
  state: () => ({
    isDarkTheme: useDark(),
    isMenuCollapsed: useStorage('isMenuCollapsed', false),
    isSmallScreen: useMediaQuery('(max-width: 700px)'),
  }),
});
```

### Tool Store
- Manages favorite tools
- Handles tool categories
- Persists user preferences

## Styling System

### UnoCSS Configuration
```typescript
// unocss.config.ts
export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetTypography(),
    presetScrollbar()
  ],
  shortcuts: {
    'bg-surface': 'bg-#ffffff dark:bg-#232323',
    'bg-background': 'bg-#f1f5f9 dark:bg-#1c1c1c',
  },
});
```

### Theme System
- **Light/Dark Mode**: Automatic system preference detection
- **Custom Overrides**: Naive UI theme customization
- **CSS Variables**: Dynamic theming with `v-bind()`

## Testing Strategy

### Unit Tests
```typescript
// *.test.ts files
import { describe, it, expect } from 'vitest';
import { myFunction } from './my-module';

describe('myFunction', () => {
  it('should work correctly', () => {
    expect(myFunction('input')).toBe('expected');
  });
});
```

### E2E Tests
```typescript
// *.e2e.spec.ts files
import { test, expect } from '@playwright/test';

test('tool functionality', async ({ page }) => {
  await page.goto('/my-tool');
  await page.fill('[data-testid="input"]', 'test');
  await expect(page.locator('[data-testid="output"]')).toHaveText('expected');
});
```

## Performance Considerations

### Code Splitting
- **Lazy Loading**: All tools are dynamically imported
- **Route-based Splitting**: Each tool is a separate chunk
- **Component Splitting**: Large components split into smaller pieces

### Optimization
- **Tree Shaking**: Unused code elimination
- **Bundle Analysis**: Regular bundle size monitoring
- **Caching**: Service worker for offline functionality

## Deployment

### Vercel Deployment
- **Automatic**: Git push triggers deployment
- **Preview**: PR previews for testing
- **Analytics**: Built-in performance monitoring

### Docker Support
```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder
# Build process
FROM nginx:alpine AS production
# Serve static files
```

## Common Patterns

### 1. Input/Output Tools
```vue
<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <c-card title="Input">
      <c-input-text v-model="input" />
    </c-card>
    <c-card title="Output">
      <c-text-copyable :value="output" />
    </c-card>
  </div>
</template>
```

### 2. File Processing Tools
```typescript
const handleFileUpload = (file: File) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target?.result as string;
    // Process file content
  };
  reader.readAsText(file);
};
```

### 3. Real-time Tools
```typescript
const { start, stop, elapsed } = useStopwatch();
// Use in chronometer, benchmark tools
```

## Troubleshooting

### Common Issues
1. **Tool not appearing**: Check import in `src/tools/index.ts`
2. **Translation missing**: Add to all `locales/*.yml` files
3. **Build errors**: Check TypeScript types and imports
4. **Styling issues**: Verify UnoCSS classes and theme variables

### Debug Tools
- **Vue DevTools**: Component inspection
- **Network Tab**: API calls and resource loading
- **Console**: Error logging and debugging

## Contributing

### Code Style
- **ESLint**: Enforced via CI/CD
- **Prettier**: Code formatting
- **TypeScript**: Strict mode enabled
- **Vue**: Composition API preferred

### Git Workflow
1. Fork repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request
5. Code review and merge

### Tool Addition Checklist
- [ ] Tool definition in `index.ts`
- [ ] Vue component implementation
- [ ] Added to appropriate category
- [ ] Translations in all languages
- [ ] Unit tests (if applicable)
- [ ] E2E tests (if applicable)
- [ ] Documentation updates

## Key Files to Understand

### Core Files
- `src/main.ts` - Application entry point
- `src/App.vue` - Root component
- `src/router.ts` - Route configuration
- `src/tools/index.ts` - Tool registry
- `vite.config.ts` - Build configuration

### Important Directories
- `src/tools/` - All tool implementations
- `src/ui/` - Custom UI component library
- `src/composable/` - Reusable Vue composables
- `locales/` - Internationalization files

This context should provide comprehensive understanding for developers working on the IT-Tools project.
