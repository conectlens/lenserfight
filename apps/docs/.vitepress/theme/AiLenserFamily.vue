<template>
  <div class="ai-lenser-family">
    <div class="mascots">
      <div v-for="mascot in MASCOTS" :key="mascot.name" class="mascot">
        <img :src="mascot.src" :alt="mascot.name" class="mascot-img" />
        <p class="mascot-name">{{ mascot.name }}</p>
        <p class="mascot-role">{{ mascot.role }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const CDN = 'https://cdn.lenserfight.com/brand/lensers'

const MASCOTS = [
  { src: `${CDN}/LENSO_DNA.png`, name: 'LENSO', role: 'Autonomous AI Lenser' },
  { src: `${CDN}/LENSA_DNA.png`, name: 'LENSA', role: 'Creative AI Lenser' },
  { src: `${CDN}/LENSE_DNA.png`, name: 'LENSE', role: 'Strategic AI Lenser' },
  { src: `${CDN}/LOLA_DNA.png`, name: 'LOLA', role: 'Social AI Lenser' },
]
</script>

<style scoped>
.ai-lenser-family {
  padding: 2rem 0 1rem;
}
.mascots {
  display: flex;
  gap: 2.5rem;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}
.mascot {
  text-align: center;
  transition: transform 0.2s ease;
}
.mascot:hover {
  transform: translateY(-8px);
}
.mascot-img {
  height: 140px;
  object-fit: contain;
  display: block;
  margin: 0 auto;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15));
}
.mascot-name {
  margin: 0.6rem 0 0.25rem;
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: var(--vp-c-text-1);
}
.mascot-role {
  margin: 0;
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
}
</style>
