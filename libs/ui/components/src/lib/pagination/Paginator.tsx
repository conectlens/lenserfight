import { useMemo } from 'react'

interface PaginatorProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  /** Maximum visible page buttons before showing ellipsis. Default: 5 */
  maxVisiblePages?: number
  showPrevNext?: boolean
  className?: string
}

/**
 * Numbered pagination component for apps/admin, apps/arena, apps/auth, apps/mobile, etc.
 *
 * Renders: ← Prev  1  2  [3]  4  5  …  12  Next →
 * Accessible: aria-label, aria-current="page", keyboard navigable.
 * Consumes `currentPage` + `totalPages` from `usePaginationController`.
 */
export function Paginator({
  currentPage,
  totalPages,
  onPageChange,
  maxVisiblePages = 5,
  showPrevNext = true,
  className = '',
}: PaginatorProps) {
  const pages = useMemo(
    () => buildPageList(currentPage, totalPages, maxVisiblePages),
    [currentPage, totalPages, maxVisiblePages],
  )

  if (totalPages <= 1) return null

  return (
    <nav
      aria-label="Pagination"
      className={`flex items-center justify-center gap-1 ${className}`}
    >
      {showPrevNext && (
        <PageButton
          label="← Prev"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Go to previous page"
        />
      )}

      {pages.map((entry, i) =>
        entry === 'ellipsis' ? (
          <span
            key={`ellipsis-${i}`}
            className="px-2 py-1 text-sm text-gray-400 select-none"
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <PageButton
            key={entry}
            label={String(entry)}
            onClick={() => onPageChange(entry as number)}
            active={entry === currentPage}
            aria-label={`Go to page ${entry}`}
            aria-current={entry === currentPage ? 'page' : undefined}
          />
        ),
      )}

      {showPrevNext && (
        <PageButton
          label="Next →"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Go to next page"
        />
      )}
    </nav>
  )
}

interface PageButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
  'aria-label'?: string
  'aria-current'?: 'page' | undefined
}

function PageButton({ label, onClick, disabled, active, ...aria }: PageButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'min-w-[2rem] rounded px-2 py-1 text-sm font-medium transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        active
          ? 'bg-primary text-white'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
      ]
        .filter(Boolean)
        .join(' ')}
      {...aria}
    >
      {label}
    </button>
  )
}

/** Compute which page numbers (and 'ellipsis' sentinels) to render. */
function buildPageList(
  current: number,
  total: number,
  maxVisible: number,
): Array<number | 'ellipsis'> {
  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const half = Math.floor(maxVisible / 2)
  let start = Math.max(2, current - half)
  let end = Math.min(total - 1, current + half)

  // Clamp window to stay within bounds
  if (current - half < 2) end = Math.min(total - 1, maxVisible - 1)
  if (current + half > total - 1) start = Math.max(2, total - maxVisible + 2)

  const pages: Array<number | 'ellipsis'> = [1]

  if (start > 2) pages.push('ellipsis')

  for (let p = start; p <= end; p++) pages.push(p)

  if (end < total - 1) pages.push('ellipsis')

  pages.push(total)

  return pages
}
