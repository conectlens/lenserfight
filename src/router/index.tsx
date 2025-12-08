
import React from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, BrowserRouter } from 'react-router-dom';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage';
import { DashboardLayout } from '../layout/DashboardLayout';
import { PublicLayout } from '../layout/PublicLayout';
import { HomePage } from '../features/home/pages/HomePage';
import { ThreadDetailPage } from '../features/threads/pages/ThreadDetailPage';
import { PromptsPage } from '../features/prompts/pages/PromptsPage';
import { PromptDetailPage } from '../features/prompts/pages/PromptDetailPage';
import { LenserProfilePage } from '../features/lensers/pages/LenserProfilePage';
import { SettingsPage } from '../features/settings/pages/SettingsPage';
import { TagCloudPage } from '../features/tags/pages/TagCloudPage';
import { TagDetailPage } from '../features/tags/pages/TagDetailPage';
import { ShortLinkRedirect } from '../features/share/pages/ShortLinkRedirect';
import { WaitingListPage } from '../features/waitingList/pages/WaitingListPage';
import { LeaderboardPage } from '../features/leaderboard/pages/LeaderboardPage';
import { ScrollToTop } from '../components/ScrollToTop';
import { GlobalAnalytics } from '../components/GlobalAnalytics';

// Public Pages
import { AboutPage } from '../features/public/pages/AboutPage';
import { EcosystemPage } from '../features/public/pages/EcosystemPage';
import { ContactPage } from '../features/public/pages/ContactPage';
import { LegalPage } from '../features/public/pages/LegalPage';
import { WelcomePage } from '../features/public/pages/WelcomePage';

// Admin Pages
import { AdminLayout } from '../features/admin/layout/AdminLayout';
import { AdminWelcome } from '../features/admin/pages/AdminWelcome';
import { AdminAnalytics } from '../features/admin/pages/AdminAnalytics';
import { AdminUsers } from '../features/admin/pages/AdminUsers';
import { AdminDesign } from '../features/admin/pages/AdminDesign';
import { AdminFeedbacks } from '../features/admin/pages/AdminFeedbacks';
import { AdminWaitlist } from '../features/admin/pages/AdminWaitlist';
import { AdminContacts } from '../features/admin/pages/AdminContacts';

import { useLenser } from '../context/LenserContext';

// Protected Admin Guard
const ProtectedAdminRoute = () => {
  const { lenser, isLoading } = useLenser();
  
  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!lenser || !lenser.is_super_admin) return <Navigate to="/" replace />;
  return <Outlet />;
};

// Wrapper for public routes to apply layout
const PublicRouteWrapper = () => (
  <PublicLayout>
    <Outlet />
  </PublicLayout>
);

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <GlobalAnalytics />
      <Routes>
        
        {/* Short Link Redirect Route (No Layout) */}
        <Route path="/s/:shortId" element={<ShortLinkRedirect />} />

        {/* Auth Routes (Self-contained Layouts) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/welcome" element={<PublicLayout><WelcomePage /></PublicLayout>} />

        {/* Public Marketing Routes */}
        <Route element={<PublicRouteWrapper />}>
            <Route path="/about" element={<AboutPage />} />
            <Route path="/about/vision" element={<AboutPage />} />
            <Route path="/about/mission" element={<AboutPage />} />
            
            <Route path="/ecosystem" element={<EcosystemPage />} />
            <Route path="/ecosystem/lens" element={<EcosystemPage />} />
            <Route path="/ecosystem/lenser" element={<EcosystemPage />} />
            <Route path="/ecosystem/len" element={<EcosystemPage />} />
            
            <Route path="/contact" element={<ContactPage />} />
            
            <Route path="/legal" element={<LegalPage />} />
            <Route path="/legal/privacy" element={<LegalPage />} />
            <Route path="/legal/terms" element={<LegalPage />} />
        </Route>
        
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
          path="/leaderboard" 
          element={
            <DashboardLayout>
              <LeaderboardPage />
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

        <Route 
          path="/prompts" 
          element={
            <DashboardLayout>
              <PromptsPage />
            </DashboardLayout>
          } 
        />

        <Route 
          path="/prompts/:id" 
          element={
            <DashboardLayout>
              <PromptDetailPage />
            </DashboardLayout>
          } 
        />
        
        <Route 
          path="/tags" 
          element={
            <DashboardLayout>
              <TagCloudPage />
            </DashboardLayout>
          } 
        />

        <Route 
          path="/tags/:slug" 
          element={
            <DashboardLayout>
              <TagDetailPage />
            </DashboardLayout>
          } 
        />

        <Route 
          path="/tags/:slug/:tab" 
          element={
            <DashboardLayout>
              <TagDetailPage />
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
        <Route 
          path="/settings" 
          element={<Navigate to="/settings/account" replace />} 
        />
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

        {/* ADMIN ROUTES */}
        <Route element={<ProtectedAdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminWelcome />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="design" element={<AdminDesign />} />
            <Route path="feedbacks" element={<AdminFeedbacks />} />
            <Route path="waitlist" element={<AdminWaitlist />} />
            <Route path="contacts" element={<AdminContacts />} />
          </Route>
        </Route>
        
        {/* Default Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
