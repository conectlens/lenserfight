import React from 'react'

export interface PressableProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onPress' | 'style'> {
  /** Triggered on click/press. Native callers pass `() => void`; web internals pass MouseEvent. */
  onPress?: ((event: React.MouseEvent<HTMLButtonElement>) => void) | (() => void)
  onLongPress?: () => void
  /** Whether this is a purely visual pressable (no semantic button role) */
  asChild?: boolean
  /** Native-only: opt-in haptic feedback. Ignored on web. */
  haptic?: boolean
  /** Native-only: pressed opacity (0–1). Ignored on web. */
  pressedOpacity?: number
  /**
   * Style. On web this is a CSSProperties object; on native this can be a ViewStyle
   * or an array of ViewStyle entries. Accept a loose type so shared call-sites typecheck.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  style?: any
  /** Native accessibility props. Ignored on web (web uses aria-* attributes). */
  accessible?: boolean
  accessibilityLabel?: string
  accessibilityRole?:
    | 'button'
    | 'link'
    | 'menuitem'
    | 'tab'
    | 'none'
    | 'checkbox'
    | 'radio'
    | 'switch'
  accessibilityHint?: string
  accessibilityState?: {
    disabled?: boolean
    checked?: boolean | 'mixed'
    selected?: boolean
  }
  testID?: string
}

/**
 * Platform-agnostic pressable primitive. On web it renders as a `<button>`.
 * Handles disabled state, focus ring, and cursor consistently.
 *
 * Prefer this over raw `<button>` elements to ensure consistent interaction styling.
 *
 * @example
 * <Pressable onPress={() => doSomething()}>
 *   <Icon name="heart" />
 * </Pressable>
 */
export const Pressable = React.forwardRef<HTMLButtonElement, PressableProps>(
  (
    {
      onPress,
      onClick,
      onLongPress,
      disabled,
      className = '',
      children,
      type = 'button',
      // Drop native-only props so they don't end up on the DOM node.
      haptic: _haptic,
      pressedOpacity: _pressedOpacity,
      accessible: _accessible,
      accessibilityLabel,
      accessibilityRole: _accessibilityRole,
      accessibilityHint: _accessibilityHint,
      accessibilityState: _accessibilityState,
      testID,
      style,
      asChild: _asChild,
      ...props
    },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // The function-form onPress (native shape) is also callable with no args.
      ;(onPress as ((event: React.MouseEvent<HTMLButtonElement>) => void) | undefined)?.(e)
      onClick?.(e)
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        onClick={handleClick}
        aria-label={accessibilityLabel}
        data-testid={testID}
        style={style}
        className={`
          inline-flex items-center justify-center
          cursor-pointer
          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500/50
          disabled:cursor-not-allowed disabled:opacity-40
          transition-opacity duration-fast ease-standard
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Pressable.displayName = 'Pressable'
