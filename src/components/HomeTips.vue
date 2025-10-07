<script setup lang="ts">
import { useThemeVars } from 'naive-ui';
import { useHomeTips } from '@/composable/useHomeTips';

const themeVars = useThemeVars();

const {
  currentTip,
  isVisible,
  autoRotateEnabled,
  showControls,
  nextTip,
  previousTip,
  randomTip,
  toggleAutoRotation,
  hideTips,
  onMouseEnter,
  onMouseLeave,
} = useHomeTips({
  autoRotate: true,
  rotationInterval: 8000,
  showControls: true,
});

// Get category icon
function getCategoryIcon(category: string) {
  switch (category) {
    case 'search':
      return 'icon-mdi-magnify';
    case 'shortcuts':
      return 'icon-mdi-keyboard';
    case 'tools':
      return 'icon-mdi-tools';
    case 'general':
      return 'icon-mdi-lightbulb';
    default:
      return 'icon-mdi-information';
  }
}

// Get category color
function getCategoryColor(category: string) {
  switch (category) {
    case 'search':
      return '#3b82f6'; // blue
    case 'shortcuts':
      return '#10b981'; // green
    case 'tools':
      return '#f59e0b'; // amber
    case 'general':
      return '#8b5cf6'; // purple
    default:
      return '#6b7280'; // gray-500
  }
}
</script>

<template>
  <transition name="tips-fade">
    <div
      v-if="isVisible"
      class="home-tips-container"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
    >
      <div class="tips-inline">
        <c-button
          v-if="showControls"
          variant="text"
          circle
          size="small"
          class="nav-button"
          @click="previousTip"
        >
          <n-icon size="14">
            <icon-mdi-chevron-left />
          </n-icon>
        </c-button>
        
        <div class="tips-content">
          <n-icon 
            size="14" 
            :color="getCategoryColor(currentTip.category)"
            class="category-icon"
          >
            <component :is="getCategoryIcon(currentTip.category)" />
          </n-icon>
          <span class="tips-text">
            {{ $t(`home.tips.categories.${currentTip.category}`) }}: {{ currentTip.title }} - {{ currentTip.description }}
          </span>
        </div>
        
        <div class="tips-controls">
          <c-button
            variant="text"
            circle
            size="small"
            class="nav-button"
            @click="nextTip"
          >
            <n-icon size="14">
              <icon-mdi-chevron-right />
            </n-icon>
          </c-button>
          
          <c-button
            variant="text"
            circle
            size="small"
            class="nav-button"
            @click="randomTip"
          >
            <n-icon size="14">
              <icon-mdi-dice-6 />
            </n-icon>
          </c-button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped lang="less">
.home-tips-container {
  display: flex;
  justify-content: center;
  padding: 12px 20px;
  margin-bottom: 10px;
}

.tips-inline {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 600px;
  width: 100%;
}

.tips-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: center;
}

.category-icon {
  flex-shrink: 0;
}

.tips-text {
  font-size: 14px;
  color: v-bind('themeVars.textColor3');
  line-height: 1.4;
  text-align: center;
}

.tips-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.nav-button {
  opacity: 0.6;
  transition: opacity 0.2s ease;
  
  &:hover {
    opacity: 1;
  }
}

// Transitions
.tips-fade-enter-active,
.tips-fade-leave-active {
  transition: all 0.3s ease;
}

.tips-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.tips-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

// Responsive design
@media (max-width: 768px) {
  .home-tips-container {
    padding: 8px 16px;
  }
  
  .tips-inline {
    gap: 8px;
  }
  
  .tips-text {
    font-size: 13px;
  }
  
  .tips-controls {
    gap: 2px;
  }
}

@media (max-width: 480px) {
  .tips-text {
    font-size: 12px;
  }
  
  .tips-inline {
    flex-direction: column;
    gap: 8px;
  }
  
  .tips-content {
    order: 1;
  }
  
  .tips-controls {
    order: 2;
  }
  
  .nav-button:first-child {
    order: 0;
  }
}
</style>
