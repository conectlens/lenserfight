import React from 'react'

interface MarkdownRendererProps {
  content: string
  className?: string
}

type Token =
  | { type: 'h1' | 'h2' | 'h3' | 'h4'; text: string }
  | { type: 'hr' }
  | { type: 'blockquote'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'table'; header: string[]; rows: string[][] }
  | { type: 'p'; text: string }
  | { type: 'empty' }

/**
 * Custom markdown renderer — no third-party parser.
 * Handles: h1–h4, p, strong, em, code (inline), ul, ol, blockquote, hr, table, links.
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const tokens = tokenize(content)

  return (
    <div className={className}>
      {tokens.map((token, i) => renderToken(token, i))}
    </div>
  )
}

function tokenize(md: string): Token[] {
  const lines = md.split('\n')
  const tokens: Token[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Blank line
    if (line.trim() === '') {
      tokens.push({ type: 'empty' })
      i++
      continue
    }

    // HR
    if (/^[-*_]{3,}$/.test(line.trim())) {
      tokens.push({ type: 'hr' })
      i++
      continue
    }

    // Headings
    const h4 = line.match(/^#### (.+)/)
    if (h4) { tokens.push({ type: 'h4', text: h4[1] }); i++; continue }
    const h3 = line.match(/^### (.+)/)
    if (h3) { tokens.push({ type: 'h3', text: h3[1] }); i++; continue }
    const h2 = line.match(/^## (.+)/)
    if (h2) { tokens.push({ type: 'h2', text: h2[1] }); i++; continue }
    const h1 = line.match(/^# (.+)/)
    if (h1) { tokens.push({ type: 'h1', text: h1[1] }); i++; continue }

    // Blockquote
    if (line.startsWith('> ')) {
      tokens.push({ type: 'blockquote', text: line.slice(2) })
      i++
      continue
    }

    // Unordered list — collect consecutive items
    if (/^[-*+] /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*+] /.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+] /, ''))
        i++
      }
      tokens.push({ type: 'ul', items })
      continue
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ''))
        i++
      }
      tokens.push({ type: 'ol', items })
      continue
    }

    // Table — detect header row with |
    if (line.includes('|') && i + 1 < lines.length && /^\|[-| :]+\|$/.test(lines[i + 1].trim())) {
      const header = parseTableRow(line)
      i += 2 // skip separator
      const rows: string[][] = []
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(parseTableRow(lines[i]))
        i++
      }
      tokens.push({ type: 'table', header, rows })
      continue
    }

    // Paragraph
    tokens.push({ type: 'p', text: line })
    i++
  }

  return tokens
}

function parseTableRow(line: string): string[] {
  return line
    .split('|')
    .slice(1, -1)
    .map(cell => cell.trim())
}

function renderInline(text: string): React.ReactNode {
  // Process inline: bold, italic, code, links
  const parts: React.ReactNode[] = []
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g
  let last = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index))
    }
    if (match[2]) {
      parts.push(<strong key={match.index} className="font-semibold">{match[2]}</strong>)
    } else if (match[3]) {
      parts.push(<em key={match.index}>{match[3]}</em>)
    } else if (match[4]) {
      parts.push(
        <code key={match.index} className="px-1.5 py-0.5 rounded bg-surface-overlay dark:bg-surface-raised text-sm font-mono">
          {match[4]}
        </code>
      )
    } else if (match[5] && match[6]) {
      parts.push(
        <a
          key={match.index}
          href={match[6]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:opacity-80"
        >
          {match[5]}
        </a>
      )
    }
    last = match.index + match[0].length
  }

  if (last < text.length) {
    parts.push(text.slice(last))
  }

  return parts.length === 1 ? parts[0] : parts
}

function renderToken(token: Token, key: number): React.ReactNode {
  switch (token.type) {
    case 'h1':
      return <h1 key={key} className="text-3xl font-black text-gray-900 dark:text-white mt-8 mb-4">{renderInline(token.text)}</h1>
    case 'h2':
      return <h2 key={key} className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">{renderInline(token.text)}</h2>
    case 'h3':
      return <h3 key={key} className="text-lg font-semibold text-gray-800 dark:text-gray-100 mt-6 mb-2">{renderInline(token.text)}</h3>
    case 'h4':
      return <h4 key={key} className="text-base font-semibold text-gray-700 dark:text-gray-200 mt-4 mb-2">{renderInline(token.text)}</h4>
    case 'hr':
      return <hr key={key} className="my-6 border-gray-200 dark:border-gray-700" />
    case 'blockquote':
      return (
        <blockquote key={key} className="pl-4 border-l-4 border-primary/40 text-gray-600 dark:text-gray-400 italic my-4">
          {renderInline(token.text)}
        </blockquote>
      )
    case 'ul':
      return (
        <ul key={key} className="list-disc pl-6 space-y-1 my-3 text-gray-700 dark:text-gray-300">
          {token.items.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>
      )
    case 'ol':
      return (
        <ol key={key} className="list-decimal pl-6 space-y-1 my-3 text-gray-700 dark:text-gray-300">
          {token.items.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ol>
      )
    case 'table':
      return (
        <div key={key} className="overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                {token.header.map((cell, i) => (
                  <th key={i} className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">
                    {renderInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {token.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-gray-100 dark:border-gray-800">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-gray-600 dark:text-gray-400">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'p':
      if (!token.text.trim()) return null
      return (
        <p key={key} className="text-gray-700 dark:text-gray-300 leading-relaxed my-3">
          {renderInline(token.text)}
        </p>
      )
    case 'empty':
      return null
    default:
      return null
  }
}
