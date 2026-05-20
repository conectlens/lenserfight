<template>
  <div ref="container" class="mermaid-diagram" />
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useData } from 'vitepress'

const props = defineProps<{ chart: string }>()

const container = ref<HTMLElement | null>(null)
const { isDark } = useData()
let idCounter = 0

async function render() {
  if (!container.value) return
  const { default: mermaid } = await import('mermaid')
  mermaid.initialize({ startOnLoad: false, theme: isDark.value ? 'dark' : 'neutral' })
  const id = `mermaid-diagram-${++idCounter}`
  try {
    const { svg } = await mermaid.render(id, props.chart)
    if (container.value) container.value.innerHTML = svg
  } catch {
    if (container.value) container.value.textContent = props.chart
  }
}

onMounted(render)
watch(() => props.chart, render)
watch(isDark, render)
</script>

<style scoped>
.mermaid-diagram {
  display: flex;
  justify-content: center;
  margin: 1.5rem 0;
  overflow-x: auto;
}

.mermaid-diagram :deep(svg) {
  max-width: 100%;
  height: auto;
}
</style>
