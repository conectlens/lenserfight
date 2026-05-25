import React from 'react'

export const PostHogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  React.createElement(React.Fragment, null, children)

export const usePostHog = () => ({
  screen: jest.fn(),
  identify: jest.fn(),
  reset: jest.fn(),
})
