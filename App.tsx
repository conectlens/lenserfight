import React from 'react';
import { AuthProvider } from './src/context/AuthContext';
import { LenserProvider } from './src/context/LenserContext';
import { AppRouter } from './src/router';

function App() {
  return (
    <AuthProvider>
      <LenserProvider>
        <AppRouter />
      </LenserProvider>
    </AuthProvider>
  );
}

export default App;