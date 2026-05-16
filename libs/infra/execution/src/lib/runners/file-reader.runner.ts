/**
 * FileReaderRunner — fetch a file URL and emit content as text or binary ref.
 *
 * Config schema (nodeConfig):
 *   url?: string — explicit file URL (defaults to upstream URL)
 *   allowedDomains?: string[] — domain allowlist (security: only these domains)
 *
 * Security:
 * - URL must match allowedDomains if configured (prevents SSRF).
 * - Default allowed: CDN domains only (supabase storage, our CDN).
 * - Max file size: 10MB.
 * - No execution of file content.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const DEFAULT_ALLOWED_DOMAINS = [
  'supabase.co',
  'supabase.in',
  'lenserfight.com',
  'conectlens.com',
  'cdn.lenserfight.com',
]

const MAX_FILE_SIZE = 10_485_760 // 10MB

function isDomainAllowed(url: string, allowedDomains: string[]): boolean {
  try {
    const parsed = new URL(url)
    return allowedDomains.some((d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`))
  } catch {
    return false
  }
}

export class FileReaderRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'file_reader'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const configUrl = ctx.nodeConfig['url'] as string | undefined
    const allowedDomains = (ctx.nodeConfig['allowedDomains'] as string[]) ?? DEFAULT_ALLOWED_DOMAINS

    // Resolve URL: config > upstream URL > upstream text (if looks like URL)
    let url = configUrl
    if (!url) {
      const firstUpstream = ctx.upstreamOutputs.values().next().value
      url = firstUpstream?.url ?? (firstUpstream?.text?.startsWith('http') ? firstUpstream.text : undefined)
    }

    if (!url || typeof url !== 'string') {
      return {
        output: { mediaType: 'text', text: '', data: { error: 'No file URL configured or available' }, durationMs: 0 },
      }
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return {
        output: { mediaType: 'text', text: '', data: { error: 'Invalid URL format', url }, durationMs: 0 },
      }
    }

    // Domain allowlist check
    if (!isDomainAllowed(url, allowedDomains)) {
      return {
        output: {
          mediaType: 'text',
          text: '',
          data: { error: 'URL domain not in allowlist', url, allowedDomains },
          durationMs: 0,
        },
      }
    }

    // Emit file read request for the engine to fetch
    return {
      output: {
        mediaType: 'text',
        text: `[File Read: ${url}]`,
        data: {
          __file_read_request: true,
          url,
          maxSize: MAX_FILE_SIZE,
        },
        durationMs: 0,
      },
      variableMutations: { __file_url: url },
    }
  }
}
