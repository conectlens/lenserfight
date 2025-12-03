
import React from 'react';
import { AuthProvider } from './src/context/AuthContext';
import { LenserProvider } from './src/context/LenserContext';
import { ShareProvider } from './src/context/ShareContext';
import { AppRouter } from './src/router';

function App() {
  return (
    <AuthProvider>
      <LenserProvider>
        <ShareProvider>
          <AppRouter />
        </ShareProvider>
      </LenserProvider>
    </AuthProvider>
  );
}

export default App;
