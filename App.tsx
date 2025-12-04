
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/lib/react-query';
import { AuthProvider } from './src/context/AuthContext';
import { LenserProvider } from './src/context/LenserContext';
import { ShareProvider } from './src/context/ShareContext';
import { UIProvider } from './src/context/UIContext';
import { AppRouter } from './src/router';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LenserProvider>
          <ShareProvider>
            <UIProvider>
              <AppRouter />
            </UIProvider>
          </ShareProvider>
        </LenserProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
