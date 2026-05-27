import React from 'react'

// eslint-disable-next-line @nx/enforce-module-boundaries
import { Button } from '../../../components/src/lib/Button'

export interface ModalFooterButton {
  label: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  disabled?: boolean
  isLoading?: boolean
  className?: string
}

export interface ModalFooterProps {
  /** Left slot: Cancel / Back / destructive action. On mobile stacks below primary. */
  leftButton?: ModalFooterButton
  /** Right primary action (Save, Create, Publish). On mobile stacks above left. */
  primaryButton?: ModalFooterButton
  /** Extra right-side buttons inserted before primaryButton (e.g. Cancel in 3-part footer). */
  rightButtons?: ModalFooterButton[]
  /** Show top border separator. Default: true. */
  border?: boolean
  className?: string
}

function FooterButton({ btn }: { btn: ModalFooterButton }) {
  return (
    <Button
      type={btn.type ?? 'button'}
      variant={btn.variant ?? 'secondary'}
      onClick={btn.onClick}
      disabled={btn.disabled}
      isLoading={btn.isLoading}
      className={btn.className}
    >
      {btn.label}
    </Button>
  )
}

export const ModalFooter: React.FC<ModalFooterProps> = ({
  leftButton,
  primaryButton,
  rightButtons,
  border = true,
  className = '',
}) => {
  const hasRight = primaryButton || (rightButtons && rightButtons.length > 0)

  return (
    <div
      className={[
        'flex flex-col-reverse gap-3 pt-4',
        border ? 'border-t border-surface-border' : '',
        'sm:flex-row sm:items-center sm:justify-between',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-center gap-2">
        {leftButton ? <FooterButton btn={leftButton} /> : <span aria-hidden="true" />}
      </div>

      {hasRight && (
        <div className="flex items-center gap-2">
          {rightButtons?.map((btn, i) => <FooterButton key={i} btn={btn} />)}
          {primaryButton && <FooterButton btn={{ variant: 'primary', ...primaryButton }} />}
        </div>
      )}
    </div>
  )
}

ModalFooter.displayName = 'ModalFooter'
