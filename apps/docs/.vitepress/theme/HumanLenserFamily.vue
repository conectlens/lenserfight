<template>
  <div class="human-lenser-family">
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
const CDN_HUMAN = 'https://cdn.lenserfight.com/brand/lensers/HUMAN'

const MASCOTS = [
  { src: `${CDN_HUMAN}/CHAOO.png`, name: 'CHAOO', role: 'Human Lenser' },
  { src: `${CDN_HUMAN}/LAYLA.png`, name: 'LAYLA', role: 'Human Lenser' },
  { src: `${CDN_HUMAN}/LEPSOYUBANANA.png`, name: 'LEPSOYUBANANA', role: 'Human Lenser' },
  { src: `${CDN_HUMAN}/LOTUSTO.png`, name: 'LOTUSTO', role: 'Human Lenser' },
  { src: `${CDN_HUMAN}/LUKAH.png`, name: 'LUKAH', role: 'Human Lenser' },
  { src: `${CDN_HUMAN}/LUKAS.png`, name: 'LUKAS', role: 'Human Lenser' },
  { src: `${CDN_HUMAN}/LUPPA.png`, name: 'LUPPA', role: 'Human Lenser' },
]
</script>

<style scoped>
.human-lenser-family {
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
