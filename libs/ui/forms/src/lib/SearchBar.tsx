import React from 'react'

export interface SearchBarProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void
  /** Show a loading indicator in place of the search icon */
  loading?: boolean
}

/**
 * Search input with leading icon and clear button.
 *
 * @example
 * <SearchBar
 *   value={query}
 *   onChange={e => setQuery(e.target.value)}
 *   onClear={() => setQuery('')}
 *   placeholder="Search lenses…"
 * />
 */
export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  ({ onClear, loading = false, value, className = '', disabled, ...props }, ref) => {
    const hasValue = Boolean(value)

    return (
      <div className={`relative flex items-center ${className}`}>
        {/* Leading search icon */}
        <span className="pointer-events-none absolute left-3 flex items-center text-greyscale-400">
          {loading ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </span>

        <input
          ref={ref}
          type="search"
          value={value}
          disabled={disabled}
          className={`
            w-full rounded-xl border bg-surface-raised
            pl-9 pr-${hasValue && onClear ? '9' : '3.5'} py-2.5
            text-sm text-greyscale-900 placeholder:text-greyscale-400
            dark:text-greyscale-50 dark:placeholder:text-greyscale-600
            outline-none
            border-surface-border
            shadow-neu-1 focus:shadow-neu-inset-1
            focus:border-deep-lens-navy-400 focus:ring-2 focus:ring-deep-lens-navy-400/20
            dark:focus:border-primary-yellow-500 dark:focus:ring-primary-yellow-500/20
            transition-all duration-normal ease-standard
            [&::-webkit-search-cancel-button]:hidden
            ${disabled ? 'opacity-50 cursor-not-allowed shadow-none' : ''}
          `}
          {...props}
        />

        {/* Clear button */}
        {hasValue && onClear && !disabled && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={onClear}
            className="absolute right-3 flex items-center text-greyscale-400 hover:text-greyscale-600 dark:hover:text-greyscale-300 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 12 12">
              <path d="M10.293 1.293a1 1 0 011.414 1.414L7.414 6l4.293 4.293a1 1 0 01-1.414 1.414L6 7.414l-4.293 4.293a1 1 0 01-1.414-1.414L4.586 6 .293 1.707A1 1 0 011.707.293L6 4.586l4.293-4.293a1 1 0 011 1z" />
            </svg>
          </button>
        )}
      </div>
    )
  }
)

SearchBar.displayName = 'SearchBar'
