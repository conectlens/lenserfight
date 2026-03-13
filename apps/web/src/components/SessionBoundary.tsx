import React from 'react'

import { useAuth } from '../context/AuthContext'

interface SessionBoundaryProps {
  children: React.ReactNode
}

/**
 * SessionBoundary acts as a hard reset mechanism for the application state.
 *
 * By using the user's ID as a React `key`, we force React to completely unmount
 * and destroy the entire component tree within this boundary whenever the user changes
 * (logs out or logs in as a different user).
 *
 * This ensures that:
 * 1. All Context Providers inside (Lenser, UI, Share) reset to their initial state.
 * 2. All `useState` and `useReducer` hooks in the app are cleared.
 * 3. No stale props or memoized selectors persist from the previous session.
 */
export const SessionBoundary: React.FC<SessionBoundaryProps> = ({ children }) => {
  const { user, isLoading } = useAuth()

  // If we are currently loading auth state (e.g. on first refresh),
  // we might want to wait or just render.
  // Using `isLoading` helps prevent double-mounting if auth state flips quickly on load.
  if (isLoading) {
    return null // Or a global spinner if desired
  }

  // 'guest' key ensures that even unauthenticated state is consistent
  // and distinct from a logged-in state.
  const sessionKey = user ? user.id : 'guest'

  return (
    <div key={sessionKey} className="contents">
      {children}
    </div>
  )
}
