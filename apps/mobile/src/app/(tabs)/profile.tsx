import { useRouter } from 'expo-router'
import React from 'react'

import { ProfileScreen } from '../../features/profile/ProfileScreen'

export default function ProfileTab() {
  const router = useRouter()
  return <ProfileScreen onSignedOut={() => router.replace('/(tabs)')} />
}
