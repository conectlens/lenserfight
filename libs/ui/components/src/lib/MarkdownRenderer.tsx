import React from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'

export interface MarkdownRendererProps {
  content: string
  className?: string
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
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
      <ReactMarkdown rehypePlugins={[rehypeRaw]}>{content}</ReactMarkdown>
    </div>
  )
}
