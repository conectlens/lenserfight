/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'tools-changelog',
    root: import.meta.dirname,
    watch: false,
    include: ['src/**/*.spec.mjs'],
    environment: 'node',
  },
})
