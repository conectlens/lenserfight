import { forwardRef, type AnchorHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { useLocale } from './useLocale'
import { withLocale } from '@lenserfight/utils/locale'

export interface LocaleLinkProps extends Omit<LinkProps, 'to'> {
  to: string
}

const EXTERNAL_PROTOCOLS = /^(https?:\/\/|mailto:|tel:|sms:|ftp:|\/\/)/i

function isExternal(to: string): boolean {
  return EXTERNAL_PROTOCOLS.test(to)
}

function isAbsolute(to: string): boolean {
  return to.startsWith('/')
}

export const LocaleLink = forwardRef<HTMLAnchorElement, LocaleLinkProps>(
  function LocaleLink({ to, children, ...rest }, ref) {
    const { locale } = useLocale()

    if (isExternal(to)) {
      const anchorProps = rest as AnchorHTMLAttributes<HTMLAnchorElement>
      return (
        <a ref={ref} href={to} {...anchorProps}>
          {children}
        </a>
      )
    }

    const resolved = isAbsolute(to) ? withLocale(to, locale) : to
    return (
      <Link ref={ref} to={resolved} {...rest}>
        {children}
      </Link>
    )
  },
)
