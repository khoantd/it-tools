import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useStorage } from '@vueuse/core';
import type { Tip, TipsConfig } from './homeTips.types';

// Tips database
const tips: Tip[] = [
  {
    id: 'search-prefix',
    title: 'Quick Search Shortcuts',
    description: 'Use prefixes like "g:" for Google, "gh:" for GitHub, "mdn:" for MDN docs, and "npm:" for package search',
    category: 'search',
    keywords: ['search', 'shortcuts', 'prefix', 'google', 'github'],
  },
  {
    id: 'keyboard-nav',
    title: 'Keyboard Navigation',
    description: 'Use arrow keys to navigate search results, Enter to select, and Escape to close',
    category: 'shortcuts',
    keywords: ['keyboard', 'navigation', 'arrow', 'enter', 'escape'],
  },
  {
    id: 'favorites',
    title: 'Favorite Tools',
    description: 'Click the heart icon on any tool to add it to your favorites for quick access',
    category: 'tools',
    keywords: ['favorites', 'heart', 'bookmark', 'quick access'],
  },
  {
    id: 'drag-drop',
    title: 'Reorder Favorites',
    description: 'Drag and drop your favorite tools to reorder them in the favorites section',
    category: 'tools',
    keywords: ['drag', 'drop', 'reorder', 'favorites', 'organize'],
  },
  {
    id: 'command-palette',
    title: 'Command Palette',
    description: 'Press Ctrl+K (or Cmd+K on Mac) to open the command palette for quick tool access',
    category: 'shortcuts',
    keywords: ['command', 'palette', 'ctrl+k', 'cmd+k', 'quick access'],
  },
  {
    id: 'dark-mode',
    title: 'Dark Mode Toggle',
    description: 'Switch between light and dark themes using the theme toggle in the navigation',
    category: 'general',
    keywords: ['dark', 'light', 'theme', 'toggle', 'mode'],
  },
  {
    id: 'tool-categories',
    title: 'Tool Categories',
    description: 'Tools are organized into categories like Crypto, Converter, Web, Development, and more',
    category: 'tools',
    keywords: ['categories', 'crypto', 'converter', 'web', 'development'],
  },
  {
    id: 'new-tools',
    title: 'New Tools',
    description: 'Check the "Newest tools" section to discover recently added tools and features',
    category: 'tools',
    keywords: ['new', 'recent', 'latest', 'discover', 'features'],
  },
  {
    id: 'search-tools',
    title: 'Search Tools',
    description: 'Type any tool name, description, or keyword in the search bar to find relevant tools',
    category: 'search',
    keywords: ['search', 'find', 'tools', 'keywords', 'description'],
  },
  {
    id: 'external-links',
    title: 'External Resources',
    description: 'Use search prefixes to quickly access external resources like documentation and repositories',
    category: 'search',
    keywords: ['external', 'resources', 'documentation', 'repositories', 'links'],
  },
];

export function useHomeTips(config: TipsConfig = {
  autoRotate: true,
  rotationInterval: 8000, // 8 seconds
  showControls: true,
}) {
  const currentTipIndex = ref(0);
  const isVisible = ref(true);
  const autoRotateEnabled = useStorage('home-tips-auto-rotate', config.autoRotate);
  const lastSeenTip = useStorage('home-tips-last-seen', 0);
  
  let rotationTimer: NodeJS.Timeout | null = null;

  // Start from a different tip than last seen
  const shuffledTips = computed(() => {
    const startIndex = (lastSeenTip.value + 1) % tips.length;
    return [...tips.slice(startIndex), ...tips.slice(0, startIndex)];
  });

  const currentTip = computed(() => shuffledTips.value[currentTipIndex.value]);

  // Auto-rotation logic
  function startAutoRotation() {
    if (!autoRotateEnabled.value) return;
    
    stopAutoRotation();
    rotationTimer = setInterval(() => {
      nextTip();
    }, config.rotationInterval);
  }

  function stopAutoRotation() {
    if (rotationTimer) {
      clearInterval(rotationTimer);
      rotationTimer = null;
    }
  }

  function nextTip() {
    currentTipIndex.value = (currentTipIndex.value + 1) % shuffledTips.value.length;
    lastSeenTip.value = currentTipIndex.value;
  }

  function previousTip() {
    currentTipIndex.value = currentTipIndex.value === 0 
      ? shuffledTips.value.length - 1 
      : currentTipIndex.value - 1;
    lastSeenTip.value = currentTipIndex.value;
  }

  function randomTip() {
    const randomIndex = Math.floor(Math.random() * shuffledTips.value.length);
    currentTipIndex.value = randomIndex;
    lastSeenTip.value = currentTipIndex.value;
  }

  function toggleAutoRotation() {
    autoRotateEnabled.value = !autoRotateEnabled.value;
    if (autoRotateEnabled.value) {
      startAutoRotation();
    } else {
      stopAutoRotation();
    }
  }

  function hideTips() {
    isVisible.value = false;
    stopAutoRotation();
  }

  function showTips() {
    isVisible.value = true;
    if (autoRotateEnabled.value) {
      startAutoRotation();
    }
  }

  // Lifecycle management
  onMounted(() => {
    if (autoRotateEnabled.value) {
      startAutoRotation();
    }
  });

  onUnmounted(() => {
    stopAutoRotation();
  });

  // Pause auto-rotation on hover
  function onMouseEnter() {
    stopAutoRotation();
  }

  function onMouseLeave() {
    if (autoRotateEnabled.value) {
      startAutoRotation();
    }
  }

  return {
    currentTip,
    isVisible,
    autoRotateEnabled,
    showControls: config.showControls,
    nextTip,
    previousTip,
    randomTip,
    toggleAutoRotation,
    hideTips,
    showTips,
    onMouseEnter,
    onMouseLeave,
  };
}
