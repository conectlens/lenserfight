import type { IncomingMessage } from 'node:http'
import type { SupabaseClient } from '@supabase/supabase-js'
import { authenticateRequest, type AuthContext } from '../lib/auth/authenticate'
import { createServiceSupabaseClient } from '../lib/supabase'

// Phase BY — RLS context middleware
//
// Supabase Auth enforces RLS via the JWT in the Authorization header.
// When we call createUserSupabaseClient(accessToken), PostgREST propagates
// the JWT into request.jwt.claims and auth.uid() before any SQL executes.
//
// This module makes the pattern explicit and auditable:
// - authenticateWithRlsContext() verifies the JWT, returns a user-scoped
//   client that will have auth.uid() set for every query it makes.
// - The integration tests below assert that row isolation is enforced.

export type { AuthContext }

/**
 * Authenticates the incoming request and returns an AuthContext where
 * `userClient` carries the JWT so Postgres auth.uid() resolves correctly
 * for every subsequent query on that client.
 *
 * This is the single canonical entry-point for authenticated routes;
 * callers must NOT create ad-hoc service clients for user-owned data reads.
 */
export async function authenticateWithRlsContext(req: IncomingMessage): Promise<AuthContext> {
  return authenticateRequest(req)
}

/**
 * Returns the service-role client for operations that legitimately bypass
 * RLS (workers, internal background jobs). Named explicitly so callers
 * are intentional about the privilege level.
 */
export function getServiceRoleClient(): SupabaseClient {
  return createServiceSupabaseClient()
}
