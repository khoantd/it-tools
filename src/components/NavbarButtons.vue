<script setup lang="ts">
import { IconBrandGithub, IconBrandX, IconInfoCircle, IconMoon, IconSun } from '@tabler/icons-vue';
import { useStyleStore } from '@/stores/style.store';

const styleStore = useStyleStore();
const { isDarkTheme } = toRefs(styleStore);
</script>

<template>
  <div class="navbar-buttons">
  <!-- <c-tooltip :tooltip="$t('home.nav.github')" position="bottom">
    <c-button
      circle
      variant="text"
      href="https://github.com/CorentinTh/it-tools"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="$t('home.nav.githubRepository')"
    >
      <n-icon size="25"><IconBrandGithub /></n-icon>
    </c-button>
  </c-tooltip> -->

  <!-- <c-tooltip :tooltip="$t('home.nav.twitterX')" position="bottom">
    <c-button
      circle
      variant="text"
      href="https://x.com/ittoolsdottech"
      rel="noopener"
      target="_blank"
      :aria-label="$t('home.nav.twitterXAccount')"
    >
      <n-icon size="25"><IconBrandX /></n-icon>
    </c-button>
  </c-tooltip> -->

  <!-- <c-tooltip :tooltip="$t('home.nav.about')" position="bottom">
    <c-button circle variant="text" to="/about" :aria-label="$t('home.nav.aboutLabel')">
      <n-icon size="25"><IconInfoCircle /></n-icon>
    </c-button>
  </c-tooltip> -->
  <c-tooltip :tooltip="isDarkTheme ? $t('home.nav.lightMode') : $t('home.nav.darkMode')" position="bottom">
    <c-button circle variant="text" :aria-label="$t('home.nav.mode')" @click="() => styleStore.toggleDark()">
      <n-icon v-if="isDarkTheme" size="25"><IconSun /></n-icon>
      <n-icon v-else size="25"><IconMoon /></n-icon>
    </c-button>
  </c-tooltip>
</div>
</template>

<style lang="less" scoped>
.navbar-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 0px;
  padding-top: 0px;
}

.navbar-button {
  margin-right: 5px;
}

.n-button {
  &:not(:last-child) {
    margin-right: 5px;
  }
}

</style>
