import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
} from '@lenserfight/features/auth'
import { OAuthCallbackPage } from '../pages/OAuthCallbackPage'
import { AccountRecoveryPage } from '../pages/AccountRecoveryPage'
import { AccountUnavailablePage } from '../pages/AccountUnavailablePage'
import { DeviceApprovalPage } from '../pages/DeviceApprovalPage'
import { GatewayGuard } from '../components/GatewayGuard'

export const AuthRouter: React.FC = () => {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      {/*
       * GatewayGuard wraps all routes: authenticated users are immediately
       * redirected to return_url (or the default forum) before any route renders.
       * This prevents the render loop where LoginPage.useEffect navigates to "/"
       * which the router then sends back to "/login" ad infinitum.
       *
       * /callback is excluded — it must render to complete the OAuth flow even
       * for users who are mid-authentication.
       */}
      <Routes>
        <Route path="/callback" element={<OAuthCallbackPage />} />
        <Route path="/account-recovery" element={<AccountRecoveryPage />} />
        <Route path="/account-unavailable" element={<AccountUnavailablePage />} />
        <Route path="/device-approval" element={<DeviceApprovalPage />} />
        <Route
          path="/*"
          element={
            <GatewayGuard>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </GatewayGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
