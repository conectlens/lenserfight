/**
 * Shared scroll-content style for all routed screens.
 *
 * GRASP — Information Expert: a single module owns the canonical screen
 * padding so every screen uses the same value without repeating it.
 *
 * 12 px (spacingN[3]) gives tighter, mobile-appropriate breathing room while
 * leaving more content visible above the fold on small devices.
 */
import { StyleSheet } from 'react-native'

export const screenStyles = StyleSheet.create({
  scroll: {
    gap: 12,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 16,
  },
})
