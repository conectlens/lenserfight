import { createRubricSignalPlugin } from './index.mjs'

const plugin = createRubricSignalPlugin()

const result = await plugin.score({
  battleId: 'battle-local-demo',
  contenderId: 'contender-a',
  slot: 'A',
  contentText:
    'The scoring plugin is useful, but one risk is weak matching. Add a test for empty content and required terms.',
})

console.log('plugin:', plugin.id())
console.log('metadata:', plugin.metadata())
console.log('result:', result)
