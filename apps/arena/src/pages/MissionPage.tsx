import React from 'react'
import { Navigate } from 'react-router-dom'

export const MissionPage: React.FC = () => {
  return <Navigate to="/about" replace />
}
