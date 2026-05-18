import { AuthExternalRedirect } from '@lenserfight/features/auth'
import { ARENA_BASE_URL, AUTH_BASE_URL } from '@lenserfight/utils/env'
import React from 'react'
import { Navigate, Route } from 'react-router-dom'

export function AuthRoutes(): React.ReactElement {
  return (
  <>
    <Route path="/auth/login" element={<AuthExternalRedirect to={`${AUTH_BASE_URL}/login`} />} />
    <Route path="/auth/register" element={<AuthExternalRedirect to={`${AUTH_BASE_URL}/register`} />} />
    <Route path="/auth/forgot-password" element={<AuthExternalRedirect to={`${AUTH_BASE_URL}/forgot-password`} />} />
    <Route path="/auth/reset-password" element={<AuthExternalRedirect to={`${AUTH_BASE_URL}/reset-password`} />} />
    <Route path="/auth" element={<AuthExternalRedirect to={`${AUTH_BASE_URL}/login`} />} />
    <Route path="/welcome" element={<AuthExternalRedirect to={`${ARENA_BASE_URL}/get-started`} />} />

    {/* Legacy path aliases */}
    <Route path="/login" element={<Navigate to="/auth/login" replace />} />
    <Route path="/register" element={<Navigate to="/auth/register" replace />} />
    <Route path="/forgot-password" element={<Navigate to="/auth/forgot-password" replace />} />
    <Route path="/reset-password" element={<Navigate to="/auth/reset-password" replace />} />
  </>
  )
}
