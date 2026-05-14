<template>
  <component
    :is="link ? 'a' : 'span'"
    :href="link"
    :target="link ? '_blank' : undefined"
    :rel="link ? 'noopener noreferrer' : undefined"
    class="docs-logo"
    :class="{ 'docs-logo--link': !!link }"
  >
    <img
      :src="computedSrc"
      :alt="title || 'LenserFight'"
      :width="size"
      :height="size"
      class="docs-logo__img"
    />
    <span v-if="showWordmark" class="docs-logo__wordmark">{{ title || 'LenserFight' }}</span>
  </component>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = withDefaults(defineProps<{
  size?: number
  showWordmark?: boolean
  imageUrl?: string
  title?: string
  link?: string
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

const computedSrc = computed(() => {
  if (props.imageUrl) return props.imageUrl
  return isDark.value
    ? 'https://cdn.lenserfight.com/brand/favicons/white/ms-icon-150x150.png'
    : 'https://cdn.lenserfight.com/brand/favicons/original/ms-icon-150x150.png'
})

</script>

<style scoped>
.docs-logo {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
}

.docs-logo--link {
  transition: opacity 0.2s, transform 0.2s;
}

.docs-logo--link:hover {
  opacity: 0.8;
  transform: translateY(-1px);
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
