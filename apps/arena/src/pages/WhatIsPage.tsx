import React from 'react'
import { Navigate } from 'react-router-dom'

export const WhatIsPage: React.FC = () => {
  return <Navigate to="/about" replace />
}
