
import React from 'react';
import { HashRouter, Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage';
import { DashboardLayout } from '../layout/DashboardLayout';
import { HomePage } from '../features/home/pages/HomePage';
import { ThreadDetailPage } from '../features/threads/pages/ThreadDetailPage';
import { PromptsPage } from '../features/prompts/pages/PromptsPage';
import { PromptDetailPage } from '../features/prompts/pages/PromptDetailPage';
import { LenserProfilePage } from '../features/lensers/pages/LenserProfilePage';
import { SettingsPage } from '../features/settings/pages/SettingsPage';
import { TagCloudPage } from '../features/tags/pages/TagCloudPage';
import { TagDetailPage } from '../features/tags/pages/TagDetailPage';
import { ShortLinkRedirect } from '../features/share/pages/ShortLinkRedirect';

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* Short Link Redirect Route */}
        <Route path="/s/:shortId" element={<ShortLinkRedirect />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        
        <Route 
          path="/" 
          element={
            <DashboardLayout>
              <HomePage />
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

        {/* Route for Tag Detail with Tab (threads/prompts) */}
        <Route 
          path="/tags/:slug/:tab" 
          element={
            <DashboardLayout>
              <TagDetailPage />
            </DashboardLayout>
          } 
        />
        
        {/* Profile Routes with Tabs */}
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

        <Route 
          path="/settings" 
          element={
            <DashboardLayout>
              <SettingsPage />
            </DashboardLayout>
          } 
        />
        
        {/* Default Redirect: Catch all unknown routes and send to / */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
