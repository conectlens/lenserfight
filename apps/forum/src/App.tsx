import React from 'react'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@lenserfight/data/cache'
import { AuthProvider, SessionBoundary, AuthExternalRedirect } from '@lenserfight/features/auth'
import { GlobalAnalytics } from '@lenserfight/infra/analytics'
import {
  ScrollToTop,
} from '@lenserfight/ui/layout'
import { ThemeProvider } from '@lenserfight/ui/theme'
import { UIProvider, AppToaster } from '@lenserfight/ui/components'
import { ShareProvider } from '@lenserfight/features/share'
import { ErrorProvider, GlobalErrorRenderer, ErrorClearer } from '@lenserfight/shared/error'
import { DashboardLayout } from '@lenserfight/features/shell'
import { HomePage } from '@lenserfight/features/home'
import { LenserBoardPage } from '@lenserfight/features/lenserboard'
import { LensersPage } from '@lenserfight/features/lensers'
import { LenserProfilePage, LenserProvider, PendingRequestsPage } from '@lenserfight/features/profile'
import {
  LensLabPage,
  LensesPage,
} from '@lenserfight/features/lenses'
import { SettingsPage } from '@lenserfight/features/settings'
import { ShortLinkRedirect } from '@lenserfight/features/share'
import {
  TagCloudPage,
  TagDetailPage,
} from '@lenserfight/features/tags'
import { ThreadDetailPage } from '@lenserfight/features/threads'
import { WaitingListPage } from '@lenserfight/features/waiting-list'
import { StorePage, WalletProvider } from '@lenserfight/features/store'
import {
  BattlesFeedPage,
  BattleDetailPage,
  BattleResultPage,
  CreateBattleWizard,
} from '@lenserfight/features/battles'
import { ModalRoute, ModalQueryDriven, useModalRouter } from '@lenserfight/ui/routing'
import { NotAuthorizedPage } from './NotAuthorizedPage'
import { AgentDetailPage, CreateAgentContent } from '@lenserfight/features/agents'
import { CreateLenserProfileModal } from '@lenserfight/features/onboarding'
import { BenchmarkSuitesPage, BenchmarkSuiteDetailPage } from '@lenserfight/features/benchmark'
import { WorkflowsPage, WorkflowBuilderPage, CreateWorkflowWizardModal } from '@lenserfight/features/workflows'
import { Routes, Route, Navigate, BrowserRouter, useNavigate, useParams } from 'react-router-dom'

const AUTH_APP_URL = import.meta.env.VITE_AUTH_BASE_URL ?? 'https://auth.lenserfight.com'
const ARENA_APP_URL = import.meta.env.VITE_ARENA_URL ?? 'https://lenserfight.com'

const WorkflowsPageRoute: React.FC = () => {
  const navigate = useNavigate()
  const { open } = useModalRouter()
  return (
    <WorkflowsPage
      onCreateWorkflow={() => open('create-workflow')}
      onOpenWorkflow={(id) => navigate(`/workflows/${id}`)}
    />
  )
}

const WorkflowBuilderPageRoute: React.FC = () => {
  const navigate = useNavigate()
  const { id, runId } = useParams<{ id: string; runId?: string }>()
  return (
    <WorkflowBuilderPage
      workflowId={id!}
      runId={runId}
      onBattleClick={(workflowId) => navigate(`/battles/create?workflow_id=${workflowId}`)}
    />
  )
}

/**
 * Onboarding wizard rendered as a route-based modal at /onboarding.
 * Step state is URL-driven via ?step=N. Backdrop dismiss is disabled
 * because profile creation is a required first-run flow.
 */
const OnboardingModal: React.FC = () => (
  <ModalRoute maxWidth="max-w-xl sm:max-w-2xl" dismissOnBackdrop={false}>
    <CreateLenserProfileModal />
  </ModalRoute>
)

const CreateBattleModal: React.FC = () => {
  const navigate = useNavigate()
  return (
    <ModalRoute
      accessCheck={({ isAuthenticated, hasLenser }) => isAuthenticated && hasLenser}
      maxWidth="max-w-2xl"
    >
      <CreateBattleWizard
        onSuccess={(slug) => navigate(`/battles/${slug}`)}
        onClose={() => navigate('/battles')}
      />
    </ModalRoute>
  )
}


const App: React.FC = () => {
  return (
    <HelmetProvider>
      <ErrorProvider>
        <QueryClientProvider client={queryClient}>
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
                        <WalletProvider>
                          <ScrollToTop />
                          <GlobalAnalytics />
                          <ErrorClearer />
                          <AppToaster />
                          <GlobalErrorRenderer>
                            <Routes>
                              {/* Short Link Redirect Route (No Layout) */}
                              <Route path="/s/:shortId" element={<ShortLinkRedirect />} />

                              {/* Auth Routes → delegated to apps/auth */}
                              <Route path="/auth/login" element={<AuthExternalRedirect to={`${AUTH_APP_URL}/login`} />} />
                              <Route path="/auth/register" element={<AuthExternalRedirect to={`${AUTH_APP_URL}/register`} />} />
                              <Route path="/auth/forgot-password" element={<AuthExternalRedirect to={`${AUTH_APP_URL}/forgot-password`} />} />
                              <Route path="/auth/reset-password" element={<AuthExternalRedirect to={`${AUTH_APP_URL}/reset-password`} />} />
                              <Route path="/auth" element={<AuthExternalRedirect to={`${AUTH_APP_URL}/login`} />} />
                              <Route path="/welcome" element={<AuthExternalRedirect to={`${ARENA_APP_URL}/get-started`} />} />

                              {/* App Dashboard Routes */}
                              <Route
                                path="/"
                                element={
                                  <DashboardLayout>
                                    <HomePage />
                                  </DashboardLayout>
                                }
                              />

                              <Route
                                path="/lenserboard"
                                element={
                                  <DashboardLayout>
                                    <LenserBoardPage />
                                  </DashboardLayout>
                                }
                              />

                              <Route
                                path="/lensers"
                                element={
                                  <DashboardLayout>
                                    <LensersPage />
                                  </DashboardLayout>
                                }
                              />

                              <Route
                                path="/threads/:threadId"
                                element={
                                  <DashboardLayout>
                                    <ThreadDetailPage />
                                  </DashboardLayout>
                                }
                              />

                              {/* Lenses Routes */}
                              <Route
                                path="/lenses"
                                element={
                                  <DashboardLayout>
                                    <LensesPage />
                                  </DashboardLayout>
                                }
                              />

                              <Route
                                path="/lenses/:id"
                                element={
                                  <DashboardLayout>
                                    <LensLabPage />
                                  </DashboardLayout>
                                }
                              />

                              {/* Ray (Tag Cloud) Routes */}
                              <Route
                                path="/ray"
                                element={
                                  <DashboardLayout>
                                    <TagCloudPage />
                                  </DashboardLayout>
                                }
                              />

                              <Route
                                path="/ray/:slug"
                                element={
                                  <DashboardLayout>
                                    <TagDetailPage />
                                  </DashboardLayout>
                                }
                              />

                              <Route
                                path="/ray/:slug/:tab"
                                element={
                                  <DashboardLayout>
                                    <TagDetailPage />
                                  </DashboardLayout>
                                }
                              />

                              <Route
                                path="/lenser/requests"
                                element={
                                  <DashboardLayout>
                                    <PendingRequestsPage />
                                  </DashboardLayout>
                                }
                              />

                              <Route
                                path="/lenser/:handle"
                                element={
                                  <DashboardLayout>
                                    <LenserProfilePage />
                                  </DashboardLayout>
                                }
                              />
                              <Route
                                path="/lenser/:handle/:tab"
                                element={
                                  <DashboardLayout>
                                    <LenserProfilePage />
                                  </DashboardLayout>
                                }
                              />

                              {/* Settings Routes with Redirect */}
                              <Route path="/settings" element={<Navigate to="/settings/account" replace />} />
                              <Route
                                path="/settings/:tab"
                                element={
                                  <DashboardLayout>
                                    <SettingsPage />
                                  </DashboardLayout>
                                }
                              />

                              <Route
                                path="/waiting-list"
                                element={
                                  <DashboardLayout>
                                    <WaitingListPage />
                                  </DashboardLayout>
                                }
                              />

                              <Route
                                path="/billing"
                                element={
                                  <DashboardLayout>
                                    <StorePage />
                                  </DashboardLayout>
                                }
                              />

                              {/* Arena / Battle Routes */}
                              <Route
                                path="/battles"
                                element={
                                  <DashboardLayout>
                                    <BattlesFeedPage />
                                  </DashboardLayout>
                                }
                              >
                                <Route path="create" element={<CreateBattleModal />} />
                              </Route>
                              {/* BattleDetailPage renders its own full-screen layout (ImmersiveArenaView) */}
                              <Route
                                path="/battles/:slug"
                                element={<BattleDetailPage />}
                              />
                              <Route
                                path="/battles/:slug/result"
                                element={
                                  <DashboardLayout>
                                    <BattleResultPage />
                                  </DashboardLayout>
                                }
                              />

                              {/* Workflow Routes */}
                              <Route
                                path="/workflows"
                                element={
                                  <DashboardLayout>
                                    <WorkflowsPageRoute />
                                  </DashboardLayout>
                                }
                              />
                              <Route
                                path="/workflows/:id"
                                element={
                                  <DashboardLayout>
                                    <WorkflowBuilderPageRoute />
                                  </DashboardLayout>
                                }
                              />
                              <Route
                                path="/workflows/:id/run/:runId"
                                element={
                                  <DashboardLayout>
                                    <WorkflowBuilderPageRoute />
                                  </DashboardLayout>
                                }
                              />

                              {/* Agent Routes */}
                              <Route path="/agents" element={<Navigate to="/lensers?type=ai" replace />} />
                              <Route
                                path="/agents/:id"
                                element={
                                  <DashboardLayout>
                                    <AgentDetailPage />
                                  </DashboardLayout>
                                }
                              />

                              {/* Benchmark Routes */}
                              <Route
                                path="/benchmark"
                                element={
                                  <DashboardLayout>
                                    <BenchmarkSuitesPage />
                                  </DashboardLayout>
                                }
                              />
                              <Route
                                path="/benchmark/:id"
                                element={
                                  <DashboardLayout>
                                    <BenchmarkSuiteDetailPage />
                                  </DashboardLayout>
                                }
                              />

                              {/* Onboarding — route-based modal, step URL-driven */}
                              <Route path="/onboarding" element={<OnboardingModal />} />

                              {/* Access control fallback */}
                              <Route
                                path="/not-authorized"
                                element={
                                  <DashboardLayout>
                                    <NotAuthorizedPage />
                                  </DashboardLayout>
                                }
                              />

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

                          {/* Global query-driven modal for creating a workflow.
                              Activated by ?modal=create-workflow anywhere in the app. */}
                          <CreateWorkflowWizardModal />

                          {/* Global query-driven modal for creating AI agents.
                              Activated by ?modal=create-agent anywhere in the app. */}
                          <ModalQueryDriven
                            name="create-agent"
                            accessCheck={({ isAuthenticated, hasLenser }) => isAuthenticated && hasLenser}
                            maxWidth="max-w-md"
                          >
                            {({ close }) => (
                              <CreateAgentContent close={close} />
                            )}
                          </ModalQueryDriven>
                        </WalletProvider>
                      </BrowserRouter>
                    </ShareProvider>
                  </UIProvider>
                </LenserProvider>
              </SessionBoundary>
            </ThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorProvider>
    </HelmetProvider>
  )
}

export default App
