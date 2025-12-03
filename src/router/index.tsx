import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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

export const AppRouter: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/app" replace />} />
        
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        
        <Route 
          path="/app" 
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
          path="/lenser/:handle" 
          element={
            <DashboardLayout>
              <LenserProfilePage />
            </DashboardLayout>
          } 
        />
        
        {/* Default Redirect: Catch all unknown routes and send to /app */}
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </HashRouter>
  );
};