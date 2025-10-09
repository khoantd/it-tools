#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Read the tools index file
const toolsIndexPath = join(projectRoot, 'src/tools/index.ts');
const toolsIndexContent = readFileSync(toolsIndexPath, 'utf-8');

// Extract tool imports and their paths
const toolImports = toolsIndexContent.match(/import { tool as (\w+) } from '\.\/([^']+)';/g) || [];
const tools = [];

// Parse each import to get tool name and path
toolImports.forEach(importLine => {
  const match = importLine.match(/import { tool as (\w+) } from '\.\/([^']+)';/);
  if (match) {
    const [, toolName, toolPath] = match;
    tools.push({ name: toolName, path: toolPath });
  }
});

// Read each tool file to extract the path
const toolPaths = [];
const baseUrl = 'https://tools.khoadue.me';

// Static pages
const staticPages = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/about', priority: '0.8', changefreq: 'monthly' },
];

// Add static pages
staticPages.forEach(page => {
  toolPaths.push({
    loc: `${baseUrl}${page.path}`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: page.changefreq,
    priority: page.priority,
  });
});

// Process each tool to get its path
for (const tool of tools) {
  try {
    const toolFilePath = join(projectRoot, 'src/tools', tool.path, 'index.ts');
    const toolContent = readFileSync(toolFilePath, 'utf-8');
    
    // Extract path from the tool definition
    const pathMatch = toolContent.match(/path:\s*['"`]([^'"`]+)['"`]/);
    if (pathMatch) {
      const toolPath = pathMatch[1];
      toolPaths.push({
        loc: `${baseUrl}${toolPath}`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: '0.7',
      });
    }
  } catch (error) {
    console.warn(`Could not read tool file for ${tool.name}: ${error.message}`);
  }
}

// Generate XML sitemap
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${toolPaths.map(page => `  <url>
    <loc>${page.loc}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

// Write sitemap to public directory
const sitemapPath = join(projectRoot, 'public', 'sitemap.xml');
writeFileSync(sitemapPath, sitemapXml);

console.log(`✅ Generated sitemap.xml with ${toolPaths.length} URLs`);
console.log(`📁 Saved to: ${sitemapPath}`);
console.log(`🌐 Base URL: ${baseUrl}`);
