/**
 * AppToaster.native.tsx — stub
 *
 * The web AppToaster uses `sonner`, which requires a DOM environment.
 * On React Native, toast notifications are deferred to a future integration
 * (e.g. react-native-toast-message). Use React Native's `Alert.alert()` at
 * the feature layer for critical messages in the meantime.
 *
 * This stub renders null so that shared imports compile without error.
 */
export const AppToaster: React.FC = () => null

// Re-export a no-op Toaster to satisfy named imports
export const Toaster = AppToaster

import React from 'react'
