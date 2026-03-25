import React from 'react'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider, SessionBoundary } from '@lenserfight/features/auth'
import { GlobalAnalytics } from '@lenserfight/infra/analytics'
import {
  ScrollToTop,
} from '@lenserfight/ui/layout'
import { ThemeProvider } from '@lenserfight/ui/theme'
import { UIProvider, AppToaster } from '@lenserfight/ui/components'
import { ShareProvider } from '@lenserfight/features/share'
import { ErrorProvider, GlobalErrorRenderer, ErrorClearer } from '@lenserfight/shared/error'
import { LenserProvider } from '@lenserfight/features/profile'
import { ShortLinkRedirect } from '@lenserfight/features/share'
import { Routes, Route, Navigate, BrowserRouter, useLocation } from 'react-router-dom'

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <ErrorProvider>
        <AuthProvider>
          <ThemeProvider>
            <SessionBoundary>
              <LenserProvider>
                <UIProvider>
                  <ShareProvider>
                    <BrowserRouter
                      future={{
                        v7_startTransition: true,
                        v7_relativeSplatPath: true
                      }}
                    >
                      <ScrollToTop />
                      <GlobalAnalytics />
                      <ErrorClearer />
                      <AppToaster />
                      <GlobalErrorRenderer>
                        <Routes>
                          {/* Short Link Redirect Route (No Layout) */}
                          <Route path="/s/:shortId" element={<ShortLinkRedirect />} />
                          {/* Redirect old routes for backward compatibility/bookmarks */}
                          <Route path="/login" element={<Navigate to="/auth/login" replace />} />
                          <Route path="/register" element={<Navigate to="/auth/register" replace />} />
                          <Route path="/forgot-password" element={<Navigate to="/auth/forgot-password" replace />} />
                          <Route path="/reset-password" element={<Navigate to="/auth/reset-password" replace />} />
                          <Route path="/prompts/*" element={<Navigate to="/lenses" replace />} />
                          <Route path="/tags/*" element={<Navigate to="/ray" replace />} />
                          <Route path="/rays/*" element={<Navigate to="/ray" replace />} />
                          <Route path="/len/*" element={<Navigate to="/ray" replace />} />
                          <Route path="/leaderboard" element={<Navigate to="/lenserboard" replace />} />
                          <Route path="/store" element={<Navigate to="/billing" replace />} />

                          {/* Default Redirect */}
                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                      </GlobalErrorRenderer>
                    </BrowserRouter>
                  </ShareProvider>
                </UIProvider>
              </LenserProvider>
            </SessionBoundary>
          </ThemeProvider>
        </AuthProvider>
      </ErrorProvider>
    </HelmetProvider>
  )
}

export default App
