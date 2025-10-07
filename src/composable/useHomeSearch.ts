import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import Fuse from 'fuse.js';
import useDebouncedRef from './debouncedref';
import { useFuzzySearch } from './fuzzySearch';
import { useToolStore } from '@/tools/tools.store';
import type { SearchResult, ExternalShortcut, GroupedSearchResults } from './homeSearch.types';

// External shortcuts configuration
const externalShortcuts: ExternalShortcut[] = [
  {
    name: 'Google',
    description: 'Search on Google',
    icon: () => import('@tabler/icons-vue').then(m => m.IconBrandGoogle),
    searchUrl: 'https://www.google.com/search?q=',
    prefix: 'g:',
    keywords: ['google', 'search', 'web'],
  },
  {
    name: 'GitHub',
    description: 'Search on GitHub',
    icon: () => import('@tabler/icons-vue').then(m => m.IconBrandGithub),
    searchUrl: 'https://github.com/search?q=',
    prefix: 'gh:',
    keywords: ['github', 'git', 'code', 'repository'],
  },
  {
    name: 'Stack Overflow',
    description: 'Search on Stack Overflow',
    icon: () => import('@tabler/icons-vue').then(m => m.IconBrandStackoverflow),
    searchUrl: 'https://stackoverflow.com/search?q=',
    prefix: 'so:',
    keywords: ['stackoverflow', 'stack', 'overflow', 'questions', 'answers'],
  },
  {
    name: 'MDN',
    description: 'Search on MDN Web Docs',
    icon: () => import('@tabler/icons-vue').then(m => m.IconBrandFirefox),
    searchUrl: 'https://developer.mozilla.org/search?q=',
    prefix: 'mdn:',
    keywords: ['mdn', 'mozilla', 'docs', 'web', 'api'],
  },
  {
    name: 'npm',
    description: 'Search on npm',
    icon: () => import('@tabler/icons-vue').then(m => m.IconBrandNpm),
    searchUrl: 'https://www.npmjs.com/search?q=',
    prefix: 'npm:',
    keywords: ['npm', 'package', 'node', 'javascript'],
  },
  {
    name: 'YouTube',
    description: 'Search on YouTube',
    icon: () => import('@tabler/icons-vue').then(m => m.IconBrandYoutube),
    searchUrl: 'https://www.youtube.com/results?search_query=',
    prefix: 'yt:',
    keywords: ['youtube', 'video', 'tutorial'],
  },
  {
    name: 'Wikipedia',
    description: 'Search on Wikipedia',
    icon: () => import('@tabler/icons-vue').then(m => m.IconBrandWikipedia),
    searchUrl: 'https://en.wikipedia.org/wiki/',
    prefix: 'wiki:',
    keywords: ['wikipedia', 'wiki', 'encyclopedia'],
  },
  {
    name: 'Can I Use',
    description: 'Check browser support',
    icon: () => import('@tabler/icons-vue').then(m => m.IconBrowser),
    searchUrl: 'https://caniuse.com/?search=',
    prefix: 'caniuse:',
    keywords: ['caniuse', 'browser', 'support', 'compatibility'],
  },
];

export function useHomeSearch() {
  const router = useRouter();
  const toolStore = useToolStore();
  const searchQuery = ref('');
  const debouncedQuery = useDebouncedRef(searchQuery, 200);
  const selectedIndex = ref(0);

  // Convert tools to search results
  const toolResults = computed<SearchResult[]>(() => 
    toolStore.tools
      .filter(tool => tool && tool.name && tool.name.trim()) // Filter out invalid tools
      .map(tool => ({
        type: 'tool' as const,
        name: tool.name,
        description: tool.description,
        icon: tool.icon,
        category: tool.category,
        keywords: tool.keywords,
        action: () => {
          router.push(tool.path);
        },
      }))
  );

  // Convert external shortcuts to search results
  const externalResults = computed<SearchResult[]>(() => 
    externalShortcuts
      .filter(shortcut => shortcut && shortcut.name && shortcut.name.trim()) // Filter out invalid shortcuts
      .map(shortcut => ({
        type: 'external' as const,
        name: shortcut.name,
        description: shortcut.description,
        icon: shortcut.icon,
        keywords: shortcut.keywords,
        action: () => {
          const query = searchQuery.value.replace(`${shortcut.prefix}`, '').trim();
          const url = `${shortcut.searchUrl}${encodeURIComponent(query)}`;
          window.open(url, '_blank');
        },
      }))
  );

  // Check if query has a prefix
  const hasPrefix = computed(() => {
    const query = debouncedQuery.value.trim();
    return externalShortcuts.some(shortcut => query.startsWith(shortcut.prefix));
  });

  // Get the matched prefix shortcut
  const matchedShortcut = computed(() => {
    const query = debouncedQuery.value.trim();
    return externalShortcuts.find(shortcut => query.startsWith(shortcut.prefix));
  });

  // Create prefix-specific result
  const prefixResult = computed<SearchResult | null>(() => {
    if (!hasPrefix.value || !matchedShortcut.value) return null;
    
    const shortcut = matchedShortcut.value;
    const query = debouncedQuery.value.replace(shortcut.prefix, '').trim();
    
    return {
      type: 'external',
      name: `Search "${query}" on ${shortcut.name}`,
      description: shortcut.description,
      icon: shortcut.icon,
      action: () => {
        const url = `${shortcut.searchUrl}${encodeURIComponent(query)}`;
        window.open(url, '_blank');
      },
    };
  });

  // Fuzzy search tools - create reactive search that updates when tools change
  const filteredTools = computed(() => {
    const query = debouncedQuery.value;
    const tools = toolResults.value;
    
    if (!query) {
      return []; // Return empty array when no query - we only show results during active search
    }
    
    // Create Fuse instance with current tools data
    const fuse = new Fuse(tools, {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'description', weight: 1 },
        { name: 'keywords', weight: 1 },
        { name: 'category', weight: 1 },
      ],
      threshold: 0.3,
    });
    
    return fuse.search(query).map(({ item }) => item);
  });

  // Filter external shortcuts based on query
  const filteredExternal = computed(() => {
    if (hasPrefix.value) return [];
    
    const query = debouncedQuery.value.toLowerCase();
    if (!query) return externalResults.value;
    
    return externalResults.value.filter(result => 
      result.name.toLowerCase().includes(query) ||
      result.description.toLowerCase().includes(query) ||
      result.keywords?.some(keyword => keyword.toLowerCase().includes(query))
    );
  });

  // Combine and group results
  const groupedResults = computed<GroupedSearchResults[]>(() => {
    const results: GroupedSearchResults[] = [];
    
    // Add prefix result if exists
    if (prefixResult.value) {
      results.push({
        name: 'Quick Search',
        items: [prefixResult.value],
      });
    }
    
    // Add filtered tools
    if (filteredTools.value.length > 0) {
      results.push({
        name: 'Tools',
        items: filteredTools.value,
      });
    }
    
    // Add external shortcuts (only if no prefix)
    if (!hasPrefix.value && filteredExternal.value.length > 0) {
      results.push({
        name: 'External Shortcuts',
        items: filteredExternal.value,
      });
    }
    
    // Ensure all items in all groups are valid
    return results.map(group => ({
      ...group,
      items: group.items.filter(item => item && item.name && item.name.trim())
    }));
  });

  // Flatten all results for keyboard navigation
  const allResults = computed(() => 
    groupedResults.value.flatMap(group => group.items)
  );

  // Reset selected index when query changes
  watch(debouncedQuery, () => {
    selectedIndex.value = 0;
  });

  // Keyboard navigation
  function handleKeydown(event: KeyboardEvent) {
    const { key } = event;
    
    if (key === 'ArrowDown') {
      event.preventDefault();
      selectedIndex.value = Math.min(selectedIndex.value + 1, allResults.value.length - 1);
    } else if (key === 'ArrowUp') {
      event.preventDefault();
      selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
    } else if (key === 'Enter') {
      event.preventDefault();
      const selectedResult = allResults.value[selectedIndex.value];
      if (selectedResult) {
        selectedResult.action();
      }
    } else if (key === 'Escape') {
      searchQuery.value = '';
    }
  }

  // Check if a result is selected
  function isSelected(result: SearchResult): boolean {
    return allResults.value[selectedIndex.value] === result;
  }

  return {
    searchQuery,
    debouncedQuery,
    groupedResults,
    allResults,
    selectedIndex,
    hasPrefix,
    matchedShortcut,
    handleKeydown,
    isSelected,
  };
}
