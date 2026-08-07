import { HelpCircle, Hash, Sparkles } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'

import { mentionService, ResolvedSegment } from '@lenserfight/data/repositories'

export interface MentionMarkdownRendererProps {
  content: string
  className?: string
}

// Link text can't contain unescaped `[` / `]` without breaking the markdown link syntax.
const escapeMarkdownLinkText = (text: string) => text.replace(/[\\[\]]/g, '\\$&')

// Mentions/tags are resolved to display text + link out-of-band, then re-inlined as
// markdown links using a custom scheme so the `a` renderer below can tell them apart
// from real links and render them as the original mention/tag badges.
const buildMarkdown = (segments: ResolvedSegment[]): string =>
  segments
    .map((segment) => {
      if (segment.type === 'text') return segment.content

      const label = escapeMarkdownLinkText(segment.content)
      const id = segment.id || ''

      if (segment.type === 'mention') {
        const params = new URLSearchParams({ type: segment.entityType || 'Entity' })
        if (segment.isValid && segment.link) params.set('link', segment.link)
        return `[${label}](mention://${id}?${params.toString()})`
      }

      if (segment.type === 'tag') {
        const params = new URLSearchParams()
        if (segment.link) params.set('link', segment.link)
        return `[${label}](tag://${id}?${params.toString()})`
      }

      return ''
    })
    .join('')

export const MentionMarkdownRenderer: React.FC<MentionMarkdownRendererProps> = ({
  content,
  className = '',
}) => {
  const [markdown, setMarkdown] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const resolve = async () => {
      if (!content) {
        if (isMounted) {
          setMarkdown('')
          setIsLoading(false)
        }
        return
      }

      setIsLoading(true)
      try {
        const segments = await mentionService.resolveContent(content)
        if (isMounted) setMarkdown(buildMarkdown(segments))
      } catch {
        // Fallback to raw content if mention resolution fails
        if (isMounted) setMarkdown(content)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    resolve()

    return () => {
      isMounted = false
    }
  }, [content])

  if (isLoading) {
    return <span className={`opacity-60 ${className}`}>Loading...</span>
  }

  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none
        prose-headings:font-bold prose-headings:tracking-tight
        prose-a:text-primary-600 dark:prose-a:text-primary-400 prose-a:no-underline hover:prose-a:underline
        prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-xs
        prose-pre:bg-gray-50 dark:prose-pre:bg-gray-900/50 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700 prose-pre:rounded-xl
        prose-img:rounded-xl prose-img:shadow-lg
        ${className}`}
    >
      <ReactMarkdown
        rehypePlugins={[rehypeRaw]}
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith('mention://')) {
              const url = new URL(href)
              const entityType = url.searchParams.get('type') || 'Entity'
              const link = url.searchParams.get('link')

              if (link) {
                return (
                  <Link
                    to={link}
                    className="not-prose inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded-md bg-primary/20 text-primary-900 hover:bg-primary/30 font-medium transition-colors align-baseline no-underline group"
                  >
                    <Sparkles size={12} className="text-primary-700 group-hover:text-primary-900" />
                    {children}
                  </Link>
                )
              }

              return (
                <span
                  className="not-prose inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 text-sm align-baseline cursor-not-allowed"
                  title={`${entityType} not found`}
                >
                  <HelpCircle size={12} />
                  {children}
                </span>
              )
            }

            if (href?.startsWith('tag://')) {
              const url = new URL(href)
              const id = url.hostname
              const link = url.searchParams.get('link') || `/ray/${id}`

              return (
                <Link
                  to={link}
                  className="not-prose inline-flex items-center gap-1 mx-0.5 px-1.5 py-0.5 rounded-md bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 hover:bg-teal-200 dark:hover:bg-teal-800/50 font-medium text-sm transition-colors align-baseline no-underline"
                >
                  <Hash size={11} />
                  {children}
                </Link>
              )
            }

            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            )
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
