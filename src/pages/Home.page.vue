<script setup lang="ts">
import { IconDragDrop, IconHeart, IconChevronDown, IconChevronUp } from '@tabler/icons-vue';
import { useHead } from '@vueuse/head';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Draggable from 'vuedraggable';
import ColoredCard from '../components/ColoredCard.vue';
import ToolCard from '../components/ToolCard.vue';
import HomeSearch from '../components/HomeSearch.vue';
// import HomeTips from '../components/HomeTips.vue';
import { useToolStore } from '@/tools/tools.store';
import { config } from '@/config';

const toolStore = useToolStore();

useHead({ title: 'IT Tools - Handy online tools for developers' });
const { t } = useI18n();

const favoriteTools = computed(() => toolStore.favoriteTools);

// Collapse state for different sections
const isNewestToolsCollapsed = ref(false);
const isAllToolsCollapsed = ref(false);

// Update favorite tools order when drag is finished
function onUpdateFavoriteTools() {
  toolStore.updateFavoriteTools(favoriteTools.value); // Update the store with the new order
}

// Toggle functions for collapse
function toggleNewestTools() {
  isNewestToolsCollapsed.value = !isNewestToolsCollapsed.value;
}

function toggleAllTools() {
  isAllToolsCollapsed.value = !isAllToolsCollapsed.value;
}
</script>

<template>
  <div>
    <!-- Hero Search Section -->
    <HomeSearch />
    
    <!-- Tips Section -->
    <!-- <HomeTips /> -->
    
    <!-- Tools Grid Section -->
    <div class="pt-50px">
      <div class="grid-wrapper">
      <div class="grid grid-cols-1 gap-12px lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-2 xl:grid-cols-4">
        <ColoredCard v-if="config.showBanner" :title="$t('home.follow.title')" :icon="IconHeart">
          {{ $t('home.follow.p1') }}
          <a
            href="https://github.com/CorentinTh/it-tools"
            rel="noopener"
            target="_blank"
            :aria-label="$t('home.follow.githubRepository')"
          >GitHub</a>
          {{ $t('home.follow.p2') }}
          <a
            href="https://x.com/ittoolsdottech"
            rel="noopener"
            target="_blank"
            :aria-label="$t('home.follow.twitterXAccount')"
          >X</a>.
          {{ $t('home.follow.thankYou') }}
          <n-icon><IconHeart /></n-icon>
        </ColoredCard>
      </div>

      <transition name="height">
        <div v-if="toolStore.favoriteTools.length > 0">
          <h3 class="mb-5px mt-25px text-neutral-400 font-500">
            {{ $t('home.categories.favoriteTools') }}
            <c-tooltip :tooltip="$t('home.categories.favoritesDndToolTip')">
              <n-icon size="18"><IconDragDrop /></n-icon>
            </c-tooltip>
          </h3>
          <Draggable
            :list="favoriteTools"
            class="grid grid-cols-1 gap-12px lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-2 xl:grid-cols-4"
            ghost-class="ghost-favorites-draggable"
            item-key="name"
            @end="onUpdateFavoriteTools"
          >
            <template #item="{ element: tool }">
              <ToolCard :tool="tool" />
            </template>
          </Draggable>
        </div>
      </transition>

      <div v-if="toolStore.newTools.length > 0">
        <div class="section-header" @click="toggleNewestTools">
          <h3 class="mb-5px mt-25px text-neutral-400 font-500 cursor-pointer flex items-center gap-2 hover:text-neutral-300 transition-colors">
            {{ t('home.categories.newestTools') }}
            <n-icon size="16" class="transition-transform duration-200" :class="{ 'rotate-180': isNewestToolsCollapsed }">
              <IconChevronDown />
            </n-icon>
          </h3>
        </div>
        <transition name="collapse">
          <div v-show="!isNewestToolsCollapsed" class="grid grid-cols-1 gap-12px lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-2 xl:grid-cols-4">
            <ToolCard v-for="tool in toolStore.newTools" :key="tool.name" :tool="tool" />
          </div>
        </transition>
      </div>

      <div class="section-header" @click="toggleAllTools">
        <h3 class="mb-5px mt-25px text-neutral-400 font-500 cursor-pointer flex items-center gap-2 hover:text-neutral-300 transition-colors">
          {{ $t('home.categories.allTools') }}
          <n-icon size="16" class="transition-transform duration-200" :class="{ 'rotate-180': isAllToolsCollapsed }">
            <IconChevronDown />
          </n-icon>
        </h3>
      </div>
      <transition name="collapse">
        <div v-show="!isAllToolsCollapsed" class="grid grid-cols-1 gap-12px lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-2 xl:grid-cols-4">
          <ToolCard v-for="tool in toolStore.tools" :key="tool.name" :tool="tool" />
        </div>
      </transition>
    </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.height-enter-active,
.height-leave-active {
  transition: all 0.5s ease-in-out;
  overflow: hidden;
  max-height: 500px;
}

.height-enter-from,
.height-leave-to {
  max-height: 42px;
  overflow: hidden;
  opacity: 0;
  margin-bottom: 0;
}

// Collapse transition styles
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease-in-out;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  max-height: 0;
  opacity: 0;
  margin-bottom: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  max-height: 2000px;
  opacity: 1;
}

// Section header styling
.section-header {
  user-select: none;
  
  h3 {
    transition: all 0.2s ease;
    
    &:hover {
      transform: translateX(2px);
    }
  }
}

// Icon rotation
.rotate-180 {
  transform: rotate(180deg);
}

.ghost-favorites-draggable {
  opacity: 0.4;
  background-color: #ccc;
  border: 2px dashed #666;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  transform: scale(1.1);
  animation: ghost-favorites-draggable-animation 0.2s ease-out;
}

@keyframes ghost-favorites-draggable-animation {
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  100% {
    opacity: 0.4;
    transform: scale(1.0);
  }
}
</style>
