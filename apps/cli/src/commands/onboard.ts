import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'onboard',
    description: 'Enter the interactive onboarding labyrinth — an AI-driven terminal runtime.',
  },
  async run() {
    const { runLabyrinth } = await import('../tui/labyrinth')
    await runLabyrinth()
  },
})
