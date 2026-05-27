// Web-only page — short-link redirects are handled in the web app.
// This stub prevents Metro from bundling the web version, which uses import.meta.env
// (unsupported in Hermes). Mobile never navigates to /s/:shortId routes.
import React from 'react'
import { View } from 'react-native'

export const ShortLinkRedirect: React.FC = () => <View />
