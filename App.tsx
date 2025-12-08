
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { queryClient } from './src/lib/react-query';
import { AuthProvider } from './src/context/AuthContext';
import { LenserProvider } from './src/context/LenserContext';
import { ShareProvider } from './src/context/ShareContext';
import { UIProvider } from './src/context/UIContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { AppRouter } from './src/router';
import { SessionBoundary } from './src/components/SessionBoundary';

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            {/* SessionBoundary forces a full remount of inner providers on user change */}
            <SessionBoundary>
              <LenserProvider>
                <ShareProvider>
                  <UIProvider>
                    <AppRouter />
                  </UIProvider>
                </ShareProvider>
              </LenserProvider>
            </SessionBoundary>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
