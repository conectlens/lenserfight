import type { Session } from '@supabase/supabase-js'
import { supabase } from './client'

// Lightweight in-memory mirror of the current Supabase session.
//
// Updated synchronously via onAuthStateChange so every caller gets the
// cached value without hitting cookie storage on each call.
//
// supabase.auth.getSession()  -> async cookie read  (eliminated for hot paths)
// supabase.auth.getUser()     -> network round-trip  (eliminated entirely)
//
// Repositories that previously called getSession()/getUser() per method
// invocation should import getCachedSession() / getCachedUserId() instead.

let _session: Session | null = null

// Eagerly seed from storage so _session is populated before the first
// INITIAL_SESSION event fires.  getSession() reads from the cookie/localStorage
// synchronously in supabase-js v2 (it's a resolved promise), but we await it
// to stay safe across versions.
const _ready: Promise<void> = supabase.auth.getSession().then(({ data }) => {
  // Only seed if onAuthStateChange hasn't already written a fresher value.
  if (_session === null) {
    _session = data.session
  }
})

supabase.auth.onAuthStateChange((_event, session) => {
  _session = session
})

export function getCachedSession(): Session | null {
  return _session
}

export function getCachedAccessToken(): string | null {
  return _session?.access_token ?? null
}

export function getCachedUserId(): string | null {
  return _session?.user?.id ?? null
}

/**
 * Returns a promise that resolves once the session cache has been seeded from
 * storage.  Await this in code paths that run before INITIAL_SESSION fires
 * (e.g. the AuthContext init) to avoid the null-session timing hole.
 */
export function waitForSessionReady(): Promise<void> {
  return _ready
}
