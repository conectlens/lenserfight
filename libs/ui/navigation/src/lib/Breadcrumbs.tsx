import { ChevronRight } from 'lucide-react'
import React from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useUI } from '@lenserfight/ui/providers'

const routeNameMap: Record<string, string> = {
  ray: 'Ray Cloud',
  lenses: 'Lenses',
  p: 'Lenses',
  threads: 'Threads',
  lenser: 'Lenser',
  lenserboard: 'LenserBoard',
  login: 'Login',
  register: 'Register',
  'forgot-password': 'Forgot Password',
  'reset-password': 'Reset Password',
  settings: 'Settings',
  notifications: 'Notifications',
}

const nonLinkableRoutes = ['lenser', 'threads']

export const Breadcrumbs: React.FC = () => {
  const location = useLocation()
  const { pageTitle } = useUI()
  const pathnames = location.pathname.split('/').filter((x) => x)

  return (
    <nav className="flex items-center text-sm font-medium text-greyscale-500 dark:text-greyscale-400 overflow-hidden whitespace-nowrap">
      <Link
        to="/"
        className={`${location.pathname === '/' ? 'text-greyscale-900 dark:text-greyscale-100 font-semibold' : 'hover:text-greyscale-900 dark:hover:text-greyscale-200'} transition-colors flex-shrink-0`}
      >
        Home
      </Link>

      {pathnames.length > 0 && (
        <>
          {pathnames.map((value, index) => {
            const to = `/${pathnames.slice(0, index + 1).join('/')}`
            const isLast = index === pathnames.length - 1

            let displayName = routeNameMap[value]

            if (!displayName) {
              if (isLast && pageTitle) {
                displayName = pageTitle
              } else {
                const isLikelyId = value.length > 20 || (value.length > 10 && /\d/.test(value))

                if (isLikelyId) {
                  displayName = 'Detail'
                } else {
                  displayName = value
                    .replace(/-/g, ' ')
                    .replace(/\b\w/g, (char) => char.toUpperCase())
                }
              }
            }

            const isNotLinkable = nonLinkableRoutes.includes(value)

            return (
              <React.Fragment key={to}>
                <ChevronRight
                  size={14}
                  className={`mx-2 flex-shrink-0 text-greyscale-400 dark:text-greyscale-600 ${!isLast ? 'hidden sm:block' : ''}`}
                />
                {isLast || isNotLinkable ? (
                  <span
                    className={`${isLast ? 'text-greyscale-900 dark:text-greyscale-100 font-semibold' : 'text-greyscale-500 dark:text-greyscale-400 hidden sm:inline'} truncate max-w-[150px] sm:max-w-[300px]`}
                  >
                    {displayName}
                  </span>
                ) : (
                  <Link
                    to={to}
                    className="hover:text-greyscale-900 dark:hover:text-greyscale-200 transition-colors flex-shrink-0 hidden sm:inline"
                  >
                    {displayName}
                  </Link>
                )}
              </React.Fragment>
            )
          })}
        </>
      )}
    </nav>
  )
}
