<template>
  <span class="docs-logo">
    <img
      :src="src"
      alt="LenserFight"
      :width="size"
      :height="size"
      class="docs-logo__img"
    />
    <span v-if="showWordmark" class="docs-logo__wordmark">LenserFight</span>
  </span>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = withDefaults(defineProps<{
  size?: number
  showWordmark?: boolean
}>(), {
  size: 48,
  showWordmark: true,
})

const isDark = ref(false)

function updateTheme() {
  isDark.value = document.documentElement.classList.contains('dark')
}

onMounted(() => {
  updateTheme()
  const observer = new MutationObserver(updateTheme)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  onUnmounted(() => observer.disconnect())
})

const src = computed(() =>
  isDark.value
    ? '/favicons/white/ms-icon-150x150.png'
    : '/favicons/original/ms-icon-150x150.png'
)

</script>

<style scoped>
.docs-logo {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.docs-logo__img {
  display: block;
  object-fit: contain;
  flex-shrink: 0;
}

.docs-logo__wordmark {
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--vp-c-text-1);
}
</style>
