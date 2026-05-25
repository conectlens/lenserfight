import React from 'react'
import { Text } from 'react-native'

export const Ionicons: React.FC<{ name: string; size?: number; color?: string; testID?: string }> = ({
  name,
  testID,
}) => <Text testID={testID}>{name}</Text>
