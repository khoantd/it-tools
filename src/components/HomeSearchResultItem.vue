<script setup lang="ts">
import { toRefs, ref, onMounted, watch } from 'vue';
import { useThemeVars } from 'naive-ui';
import type { SearchResult } from '@/composable/homeSearch.types';

const props = defineProps<{
  result: SearchResult
  selected: boolean
}>();

const { result, selected } = toRefs(props);
const themeVars = useThemeVars();
const iconComponent = shallowRef<any>(null);

const emit = defineEmits<{
  activated: [result: SearchResult]
}>();

// Handle dynamic icon loading
async function loadIcon() {
  if (typeof result.value.icon === 'function') {
    try {
      const icon = await (result.value.icon as Function)();
      iconComponent.value = icon;
    } catch (error) {
      console.error('Failed to load icon:', error);
      iconComponent.value = null;
    }
  } else {
    iconComponent.value = result.value.icon;
  }
}

// Load icon when result changes
watch(result, loadIcon, { immediate: true });

function handleClick() {
  emit('activated', result.value);
}
</script>

<template>
  <div
    class="search-result-item"
    :class="{ selected }"
    @click="handleClick"
  >
    <div class="result-icon">
      <n-icon size="20">
        <component v-if="iconComponent" :is="iconComponent" />
        <icon-mdi-help v-else />
      </n-icon>
    </div>
    
    <div class="result-content">
      <div class="result-name">
        {{ result.name }}
      </div>
      <div class="result-description">
        {{ result.description }}
      </div>
      <div v-if="result.category" class="result-category">
        {{ result.category }}
      </div>
    </div>
    
    <div v-if="result.type === 'external'" class="result-type">
      <n-icon size="16" class="text-neutral-400">
        <icon-mdi-open-in-new />
      </n-icon>
    </div>
  </div>
</template>

<style scoped lang="less">
.search-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
  border: 1px solid transparent;

  &:hover {
    background-color: v-bind('themeVars.hoverColor');
  }

  &.selected {
    background-color: v-bind('themeVars.primaryColorSuppl');
    border-color: v-bind('themeVars.primaryColor');
  }
}

.result-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: v-bind('themeVars.cardColor');
  color: v-bind('themeVars.textColor2');
}

.result-content {
  flex: 1;
  min-width: 0;
}

.result-name {
  font-weight: 500;
  color: v-bind('themeVars.textColor1');
  margin-bottom: 2px;
}

.result-description {
  font-size: 14px;
  color: v-bind('themeVars.textColor3');
  line-height: 1.4;
  margin-bottom: 2px;
}

.result-category {
  font-size: 12px;
  color: v-bind('themeVars.textColor3');
  font-weight: 500;
  opacity: 0.7;
}

.result-type {
  flex-shrink: 0;
  opacity: 0.6;
}
</style>
