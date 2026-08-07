import { defineCommand } from 'citty'
import consola from 'consola'
import { handleError } from '@lenserfight/cli-client'
import { createThread, type ThreadVisibility } from '../lib/data-services'
import { printJson } from '../utils/output'

const VALID_VISIBILITY: ThreadVisibility[] = ['public', 'community', 'private']

function isThreadVisibility(value: string): value is ThreadVisibility {
  return (VALID_VISIBILITY as string[]).includes(value)
}

// ---------------------------------------------------------------------------
// thread create --title --content [--visibility] [--tags] [--json]
// ---------------------------------------------------------------------------
const create = defineCommand({
  meta: {
    name: 'create',
    description:
      'Create a content thread, posted as your logged-in lenser profile by default. Pass --as to post as an owned AI lenser instead.',
  },
  args: {
    title: {
      type: 'string',
      description: 'Thread title',
      required: true,
    },
    content: {
      type: 'string',
      description: 'Thread body content',
      required: true,
    },
    visibility: {
      type: 'string',
      default: 'public',
      description: 'Visibility: public | community | private',
    },
    tags: {
      type: 'string',
      description: 'Comma-separated tag UUIDs to attach',
    },
    as: {
      type: 'string',
      description:
        'Post as an owned AI lenser (handle or id) instead of your human profile. Temporarily switches your account\'s active workspace — a global switch shared with the web app — then restores it afterward.',
    },
    json: {
      type: 'boolean',
      default: false,
      description: 'Output as JSON',
    },
  },
  async run({ args }) {
    if (!isThreadVisibility(args.visibility)) {
      consola.error(
        'Invalid --visibility: %s. Must be one of: %s',
        args.visibility,
        VALID_VISIBILITY.join(', '),
      )
      process.exitCode = 1
      return
    }

    const tagIds = args.tags
      ? args.tags
          .split(',')
          .map((id: string) => id.trim())
          .filter(Boolean)
      : []

    try {
      const thread = await createThread({
        title: args.title,
        content: args.content,
        visibility: args.visibility,
        tagIds,
        asLenser: args.as || undefined,
      })

      if (args.json) {
        printJson(thread)
        return
      }

      consola.success('Thread created: %s (%s)', thread.title, thread.id)
    } catch (err) {
      handleError(err)
    }
  },
})

// ---------------------------------------------------------------------------
// Root: lenserfight thread
// ---------------------------------------------------------------------------
export default defineCommand({
  meta: {
    name: 'thread',
    description: 'Create and manage content threads.',
  },
  subCommands: {
    create,
  },
})
