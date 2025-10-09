# IT-Tools Project Context Engineering Prompt

> **⚠️ MANDATORY READING**: This document is **REQUIRED** reading for all developers working on the IT-Tools project. Please read this entire document before making any changes to the codebase.

## Project Overview

**IT-Tools** is a comprehensive web application providing 90+ developer and IT utility tools. It's a Vue 3 SPA with modern architecture, multi-language support, and PWA capabilities.

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

### 3. Tool Categories (10 total, 90+ tools)
- **Crypto**: Encryption, hashing, JWT, certificates (11 tools)
- **Converter**: Data format conversions (JSON, YAML, XML, etc.) (22 tools)
- **Web**: URL utilities, HTML entities, HTTP status codes (16 tools)
- **Images/Videos**: QR codes, SVG generators, camera recorder (4 tools)
- **Development**: Git, Docker, regex, SQL formatters, Linux commands (17 tools)
- **Network**: IP calculators, MAC address tools (6 tools)
- **Math**: Mathematical calculations and evaluators (3 tools)
- **Measurement**: Time, temperature, benchmarks (3 tools)
- **Text**: Text processing, statistics, obfuscation (7 tools)
- **Data**: Phone/IBAN validation, parsing (2 tools)

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

### ⚠️ MANDATORY: Read This Document First

**Before making ANY changes to the codebase, you MUST:**

1. **Read this entire document** - This is non-negotiable
2. **Understand the project architecture** - Review the tech stack and patterns
3. **Follow the established conventions** - Use the provided templates and patterns
4. **Update documentation** - Follow the SEO and documentation update procedures

**Failure to read this document may result in:**
- Pull request rejection
- Code review delays
- Inconsistent implementations
- Missing required updates (sitemap, llms.txt, etc.)

### Pre-Development Checklist

Before starting any work, confirm you have:
- [ ] Read the entire CONTEXT_ENGINEERING_PROMPT.md
- [ ] Understood the tool system architecture
- [ ] Reviewed existing similar implementations
- [ ] Checked the tool addition checklist
- [ ] Understood SEO/documentation update requirements

### Code Style
- **ESLint**: Enforced via CI/CD
- **Prettier**: Code formatting
- **TypeScript**: Strict mode enabled
- **Vue**: Composition API preferred

### Git Workflow
1. **Read CONTEXT_ENGINEERING_PROMPT.md** (MANDATORY)
2. Fork repository
3. Create feature branch
4. Make changes with tests
5. Update documentation (sitemap, llms.txt, etc.)
6. Submit pull request
7. Code review and merge

### README Integration
This document should be referenced in the main README.md:
```markdown
## For Contributors
**⚠️ MANDATORY**: Before contributing, please read [CONTEXT_ENGINEERING_PROMPT.md](./CONTEXT_ENGINEERING_PROMPT.md) 
This document contains essential information about project architecture, conventions, and required procedures.
```

### Development Environment Setup
Consider adding a pre-commit hook or development script that reminds developers to read this document:
```bash
# In package.json scripts
"dev:check": "echo '⚠️  Have you read CONTEXT_ENGINEERING_PROMPT.md? This is MANDATORY before development!' && npm run dev"
```

### Pull Request Template
Add to `.github/pull_request_template.md`:
```markdown
## Pre-Submission Checklist
- [ ] I have read and understood [CONTEXT_ENGINEERING_PROMPT.md](./CONTEXT_ENGINEERING_PROMPT.md)
- [ ] I have followed the Tool Addition Checklist (if adding new tools)
- [ ] I have updated sitemap.xml and llms.txt (if adding new tools)
- [ ] My code follows the established patterns and conventions
```

### Tool Addition Checklist
- [ ] Tool definition in `index.ts`
- [ ] Vue component implementation
- [ ] Added to appropriate category
- [ ] Translations in all languages
- [ ] Unit tests (if applicable)
- [ ] E2E tests (if applicable)
- [ ] Documentation updates
- [ ] Update sitemap.xml files
- [ ] Update llms.txt file
- [ ] Update robots.txt (if needed)

## SEO and Documentation Updates

### When Adding New Tools or Features

When adding new tools or significant features, update the following files to ensure proper SEO indexing and documentation:

#### 1. Sitemap Updates
**Files to update:**
- `public/sitemap.xml` - Public sitemap for search engines
- `dist/sitemap.xml` - Build output sitemap

**Process:**
```xml
<!-- Add new tool entry in alphabetical order -->
<url>
  <loc>https://tools.khoadue.me/new-tool-name</loc>
  <lastmod>YYYY-MM-DD</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.7</priority>
</url>
```

**Verification:**
```bash
# Check if tool is included
grep "new-tool-name" public/sitemap.xml dist/sitemap.xml
```

#### 2. LLMs.txt Updates
**File to update:**
- `public/llms.txt` - AI/LLM documentation file

**Process:**
1. Update total tool count in the header
2. Add tool to appropriate category section
3. Include tool name, path, and description

**Example:**
```markdown
Total Tools: 91  # Increment from previous count

### Development (18 tools)  # Update category count
- **New Tool** (/new-tool-name) - Tool description
```

#### 3. Robots.txt Updates
**File to update:**
- `public/robots.txt` - Search engine directives

**When to update:**
- Only if adding new restricted areas
- Only if changing sitemap location
- Only if modifying crawl permissions

**Example additions:**
```txt
# Disallow new admin areas
Disallow: /new-admin/

# Update sitemap if location changes
Sitemap: https://tools.khoadue.me/new-sitemap.xml
```

### Automated Update Process

**Manual Process:**
1. Add tool to sitemap.xml (both public/ and dist/)
2. Update llms.txt with new tool information
3. Increment tool counts in llms.txt
4. Update category counts in llms.txt
5. Test sitemap validity
6. Verify robots.txt if needed

**Verification Commands:**
```bash
# Count total tools in codebase
grep -r "path: '/" src/tools/ --include="*.ts" | wc -l

# Verify sitemap includes new tool
grep "new-tool-name" public/sitemap.xml dist/sitemap.xml

# Verify llms.txt includes new tool
grep "new-tool-name" public/llms.txt

# Check tool count consistency
grep "Total Tools:" public/llms.txt
```

### SEO Best Practices

1. **Sitemap Priority:**
   - Homepage: 1.0
   - About page: 0.8
   - Individual tools: 0.7
   - Category pages: 0.6

2. **Change Frequency:**
   - Homepage: daily
   - About page: monthly
   - Tools: weekly
   - Static pages: monthly

3. **Last Modified:**
   - Use current date when adding new tools
   - Update when making significant changes

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

### SEO and Documentation Files
- `public/sitemap.xml` - Search engine sitemap
- `dist/sitemap.xml` - Build output sitemap
- `public/llms.txt` - AI/LLM documentation
- `public/robots.txt` - Search engine directives

---

## ⚠️ FINAL REMINDER: MANDATORY READING

**This document is REQUIRED reading for all contributors.**

### Why This Document is Mandatory:
1. **Consistency**: Ensures all developers follow the same patterns and conventions
2. **Quality**: Prevents common mistakes and ensures high-quality implementations
3. **Efficiency**: Reduces code review time and back-and-forth discussions
4. **Completeness**: Ensures all required updates (SEO, documentation) are made
5. **Maintainability**: Helps maintain the project's architecture and standards

### Enforcement:
- **Pull Request Reviews**: Reviewers will check if contributors have followed this guide
- **Code Quality**: Inconsistent implementations will be rejected
- **Documentation**: Missing updates to sitemap/llms.txt will block merges
- **Architecture**: Deviations from established patterns will require refactoring

### Quick Reference:
- **New Tool**: Follow the Tool Addition Checklist (lines 341-350)
- **SEO Updates**: Follow the SEO and Documentation Updates section (lines 325-430)
- **Architecture**: Review the Tool System Architecture (lines 32-45)
- **Patterns**: Check Common Patterns section (lines 251-283)

**Remember: Reading this document is not optional - it's a requirement for contributing to IT-Tools.**

This context should provide comprehensive understanding for developers working on the IT-Tools project.
