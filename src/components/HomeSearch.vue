<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { onClickOutside } from '@vueuse/core';
import { useThemeVars } from 'naive-ui';
import { useHomeSearch } from '@/composable/useHomeSearch';
import HomeSearchResultItem from './HomeSearchResultItem.vue';
import HomeTips from './HomeTips.vue';
import { useToolStore } from '@/tools/tools.store';
import { config } from '@/config';

const { t } = useI18n();
const themeVars = useThemeVars();
const toolStore = useToolStore();
const favoriteTools = computed(() => toolStore.favoriteTools);

const searchContainerRef = ref<HTMLElement>();
const inputRef = ref<HTMLElement>();
const showResults = ref(false);

const {
  searchQuery,
  groupedResults,
  allResults,
  handleKeydown,
  isSelected,
} = useHomeSearch();

// Show results when there's a query (regardless of whether results exist)
const shouldShowResults = computed(() => {
  const hasQuery = searchQuery.value && searchQuery.value.trim().length > 0;
  // console.log('shouldShowResults debug:', {
  //   showResults: showResults.value,
  //   hasQuery,
  //   query: searchQuery.value
  // });
  return showResults.value && hasQuery;
});

// Watch for changes in searchQuery to detect when user starts typing
watch(searchQuery, (newValue, oldValue) => {
  if (newValue && newValue.length > 0) {
    // console.log('searchQuery changed, setting showResults to true');
    showResults.value = true;
  }
});

// Handle input focus - try to access internal input element
function onFocus() {
  console.log('onFocus called, setting showResults to true');
  showResults.value = true;
}

// Handle input blur (with delay to allow clicking on results)
function onBlur() {
  console.log('onBlur called, will set showResults to false in 150ms');
  setTimeout(() => {
    console.log('Setting showResults to false after blur timeout');
    showResults.value = false;
  }, 150);
}

// Enhanced keydown handler
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    showResults.value = false;
    searchQuery.value = '';
    return;
  }
  
  handleKeydown(event);
}

// Click outside to close - TEMPORARILY DISABLED FOR DEBUGGING
// onClickOutside(searchContainerRef, () => {
//   console.log('onClickOutside called, setting showResults to false');
//   showResults.value = false;
// });

// Handle result activation
function onResultActivated(result: any) {
  result.action();
  showResults.value = false;
  searchQuery.value = '';
}

// Store cleanup functions for internal input listeners
let internalInputCleanup: (() => void) | null = null;

// Focus input on mount and setup global key handler
onMounted(() => {
  if (inputRef.value) {
    inputRef.value.focus();
  }
  
  // Try to access the internal input element and add focus/blur listeners
  nextTick(() => {
    if (inputRef.value) {
      // Access the internal input element through the component's exposed refs
      const component = inputRef.value as any; // Type assertion for component access
      const internalInput = component.inputWrapperRef?.querySelector('input');
      if (internalInput) {
        console.log('Found internal input element, adding focus/blur listeners');
        internalInput.addEventListener('focus', onFocus);
        internalInput.addEventListener('blur', onBlur);
        
        // Store cleanup function instead of calling onUnmounted here
        internalInputCleanup = () => {
          internalInput.removeEventListener('focus', onFocus);
          internalInput.removeEventListener('blur', onBlur);
        };
      } else {
        console.log('Could not find internal input element');
      }
    }
  });
  
  const handleKeyPress = (event: KeyboardEvent) => {
    // Focus search when user starts typing (if not already focused)
    if (event.target === document.body && event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      if (inputRef.value) {
        inputRef.value.focus();
        searchQuery.value = event.key;
        showResults.value = true; // Ensure results are shown when typing
      }
    }
  };
  
  document.addEventListener('keydown', handleKeyPress);
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyPress);
    // Clean up internal input listeners if they were set up
    if (internalInputCleanup) {
      internalInputCleanup();
    }
  });
});


// Update favorite tools order when drag is finished
function onUpdateFavoriteTools() {
  toolStore.updateFavoriteTools(favoriteTools.value); // Update the store with the new order
}
</script>

<template>
  <div style="margin-top: 10px;">
    <div class="home-search-container">
    <div class="search-hero">
      <div class="search-wrapper" ref="searchContainerRef">
        <div class="search-input-container">
          <c-input-text
            ref="inputRef"
            v-model:value="searchQuery"
            :placeholder="t('home.search.placeholder')"
            clearable
            raw-text
            autofocus
            class="search-input"
            @keydown="onKeydown"
          >
            <template #prefix>
              <n-icon size="20" class="text-neutral-400">
                <icon-mdi-search />
              </n-icon>
            </template>
          </c-input-text>
        </div>
        
        <div v-if="shouldShowResults" class="results-dropdown">
          <div v-for="group in groupedResults" :key="group.name" class="result-group">
            <div class="group-header">
              {{ group.name }}
            </div>
            <div class="group-items">
              <template v-for="result in group.items" :key="`${result.type}-${result.name}`">
                <HomeSearchResultItem
                  v-if="result && result.name"
                  :result="result"
                  :selected="isSelected(result)"
                  @activated="onResultActivated"
                />
              </template>
            </div>
          </div>
          
          <div v-if="groupedResults.length === 0" class="no-results">
            <n-icon size="24" class="text-neutral-400">
              <icon-mdi-magnify />
            </n-icon>
            <div class="no-results-text">
              {{ t('home.search.noResults') }}
            </div>
          </div>
        </div>
      </div>
      
      <HomeTips />
      
      <!-- <div class="search-hint">
        {{ t('home.search.pressEnter') }}
      </div> -->
    </div>
  </div>
  </div>
  
</template>

<style scoped lang="less">
.home-search-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px 40px;
  min-height: 260px;
  background: linear-gradient(135deg, 
    rgba(59, 130, 246, 0.1) 0%, 
    transparent 50%, 
    rgba(34, 197, 94, 0.1) 100%
  );
  background-size: 200% 200%;
  animation: gradientShift 8s ease infinite;
}

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.search-hero {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.search-wrapper {
  position: relative;
  width: 100%;
}

.search-input-container {
  position: relative;
}

.search-input {
  width: 100%;
  
  :deep(.input-wrapper) {
    padding: 16px 20px;
    font-size: 18px;
    border-radius: 12px;
    border: 2px solid v-bind('themeVars.borderColor');
    background-color: v-bind('themeVars.modalColor');
    backdrop-filter: blur(10px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    
    &:hover {
      border-color: v-bind('themeVars.primaryColor');
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
    }
    
    &:focus-within {
      border-color: v-bind('themeVars.primaryColor');
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
    }
  }
  
  :deep(.input) {
    font-size: 18px;
    padding: 0;
  }
}

.results-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 8px;
  background-color: v-bind('themeVars.modalColor');
  border: 1px solid v-bind('themeVars.borderColor');
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(20px);
  z-index: 1000;
  max-height: 600px;
  overflow-y: auto;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.result-group {
  padding: 8px 0;
  
  &:not(:last-child) {
    border-bottom: 1px solid v-bind('themeVars.dividerColor');
  }
}

.group-header {
  padding: 8px 16px 4px;
  font-size: 12px;
  font-weight: 600;
  color: v-bind('themeVars.textColor3');
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.group-items {
  display: flex;
  flex-direction: column;
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: v-bind('themeVars.textColor3');
}

.no-results-text {
  margin-top: 12px;
  font-size: 14px;
}

.search-hint {
  font-size: 14px;
  color: v-bind('themeVars.textColor3');
  opacity: 0.8;
  text-align: center;
}

// Responsive design
@media (max-width: 768px) {
  .home-search-container {
    padding: 40px 16px 30px;
    min-height: 300px;
  }
  
  .search-input {
    :deep(.input-wrapper) {
      padding: 14px 16px;
      font-size: 16px;
    }
    
    :deep(.input) {
      font-size: 16px;
    }
  }
  
  .results-dropdown {
    max-height: 300px;
  }
}
</style>
