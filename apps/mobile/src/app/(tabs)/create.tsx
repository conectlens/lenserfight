import { Redirect } from 'expo-router'
import React from 'react'

export default function CreateTab() {
  // Fallback redirect to index if somehow navigated directly
  return <Redirect href="/" />
}
