import { useCallback, useEffect, useRef, useState } from 'react'
import { preferencesService } from '@lenserfight/data/repositories'

// Official LenserFight Arena Soundtracks (from README § Arena Soundtrack)
export const ARENA_TRACKS = [
  { id: 'kine5GjALC0', title: 'Arena Soundtrack I' },
  { id: 'yN_44HCS1tE', title: 'Arena Soundtrack II' },
  { id: 'FM1z-M3DD24', title: 'Arena Soundtrack III' },
  { id: 's-NegE5sK9o', title: 'Arena Soundtrack IV' },
] as const

export type ArenaTrack = (typeof ARENA_TRACKS)[number]

const LOCAL_STORAGE_KEY = 'lenserfight:arena_music_enabled'

/** Read the initial enabled state from localStorage (anonymous fallback). */
function readLocalMusicEnabled(): boolean {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (raw === null) return true // default on
    return raw === 'true'
  } catch {
    return true
  }
}

/** Persist the enabled state to localStorage (anonymous). */
function writeLocalMusicEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, String(enabled))
  } catch {
    // storage quota exceeded — ignore
  }
}

export interface UseArenaMusicOptions {
  /** Whether the current visitor is authenticated. Controls persistence strategy. */
  isAuthenticated: boolean
}

export interface UseArenaMusicReturn {
  /** Whether music is currently enabled (not muted). */
  isEnabled: boolean
  /** Toggle music on/off and persist the preference. */
  toggleEnabled: () => void
  /** Index (0-based) of the currently active track. */
  currentTrackIndex: number
  /** The currently active track metadata. */
  currentTrack: ArenaTrack
  /** Ref to attach to the YouTube player div. */
  playerDivRef: React.RefObject<HTMLDivElement | null>
  /** Whether the YouTube IFrame API has finished loading. */
  playerReady: boolean
}

// Minimal local type declarations for the YouTube IFrame API
// (avoids a dependency on @types/youtube for a single hook)
interface YTPlayerOptions {
  height: string | number
  width: string | number
  videoId: string
  playerVars?: Record<string, string | number>
  events?: {
    onReady?: (event: { target: YTPlayerInstance }) => void
    onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void
    onError?: (event: { data: number }) => void
  }
}
interface YTPlayerInstance {
  playVideo(): void
  pauseVideo(): void
  mute(): void
  unMute(): void
  loadVideoById(videoId: string): void
  destroy(): void
}
interface YTNamespace {
  Player: new (el: HTMLElement, opts: YTPlayerOptions) => YTPlayerInstance
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number }
}

declare global {
  interface Window {
    YT: YTNamespace
    onYouTubeIframeAPIReady: (() => void) | undefined
  }
}

let ytApiLoading = false
let ytApiLoaded = false
const ytReadyCallbacks: Array<() => void> = []

function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (ytApiLoaded) {
      resolve()
      return
    }
    ytReadyCallbacks.push(resolve)
    if (ytApiLoading) return
    ytApiLoading = true
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      ytApiLoaded = true
      if (prev) prev()
      ytReadyCallbacks.forEach((cb) => cb())
      ytReadyCallbacks.length = 0
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  })
}

/**
 * Manages YouTube IFrame API music playback for the Battle Arena.
 *
 * - Cycles through ARENA_TRACKS in a loop (one full loop per visit)
 * - Persists the enabled/muted preference:
 *   - Authenticated: lensers.preferences.autoplay_music (async, fire-and-forget)
 *   - Anonymous:     localStorage key `lenserfight:arena_music_enabled`
 * - Reads the initial preference from lenser context (passed in) or localStorage
 */
export function useArenaMusic(
  options: UseArenaMusicOptions,
  initialPreference?: boolean
): UseArenaMusicReturn {
  const { isAuthenticated } = options

  // Determine initial enabled state: prefer DB preference, fall back to localStorage
  const resolvedInitial = initialPreference ?? readLocalMusicEnabled()
  const [isEnabled, setIsEnabled] = useState<boolean>(resolvedInitial)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [playerReady, setPlayerReady] = useState(false)

  const playerDivRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<YTPlayerInstance | null>(null)
  // Track whether we've received the first user interaction (needed for autoplay policy)
  const hasInteracted = useRef(false)

  // Sync isEnabled when the initial preference loads late (e.g., after auth resolves)
  const initialPrefRef = useRef(initialPreference)
  useEffect(() => {
    if (initialPreference !== undefined && initialPreference !== initialPrefRef.current) {
      initialPrefRef.current = initialPreference
      setIsEnabled(initialPreference)
    }
  }, [initialPreference])

  // Persist preference change
  const persist = useCallback(
    (enabled: boolean) => {
      writeLocalMusicEnabled(enabled)
      if (isAuthenticated) {
        preferencesService.updatePreferences({ autoplay_music: enabled }).catch(() => {
          /* fire-and-forget — localStorage already updated */
        })
      }
    },
    [isAuthenticated]
  )

  const toggleEnabled = useCallback(() => {
    setIsEnabled((prev) => {
      const next = !prev
      persist(next)
      if (playerRef.current) {
        if (next) {
          playerRef.current.unMute()
          playerRef.current.playVideo()
        } else {
          playerRef.current.pauseVideo()
        }
      }
      return next
    })
  }, [persist])

  // Load YouTube IFrame API and create player once div is mounted
  useEffect(() => {
    let destroyed = false

    const initPlayer = () => {
      if (destroyed || !playerDivRef.current) return
      const player = new window.YT.Player(playerDivRef.current, {
        height: '80',
        width: '140',
        videoId: ARENA_TRACKS[0].id,
        playerVars: {
          autoplay: isEnabled ? 1 : 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: { target: YTPlayerInstance }) => {
            if (destroyed) return
            playerRef.current = event.target
            setPlayerReady(true)
            if (!isEnabled) {
              event.target.mute()
            }
          },
          onStateChange: (event: { data: number; target: YTPlayerInstance }) => {
            if (destroyed) return
            // When a track ends, advance to the next one (looping)
            if (event.data === window.YT.PlayerState.ENDED) {
              setCurrentTrackIndex((prev) => {
                const next = (prev + 1) % ARENA_TRACKS.length
                playerRef.current?.loadVideoById(ARENA_TRACKS[next].id)
                return next
              })
            }
          },
          onError: (_event: { data: number }) => {
            if (destroyed) return
            // Skip errored track
            setCurrentTrackIndex((prev) => {
              const next = (prev + 1) % ARENA_TRACKS.length
              playerRef.current?.loadVideoById(ARENA_TRACKS[next].id)
              return next
            })
          },
        },
      })
      playerRef.current = player
    }

    loadYouTubeAPI().then(initPlayer)

    return () => {
      destroyed = true
      try {
        playerRef.current?.destroy()
      } catch {
        /* ignore */
      }
      playerRef.current = null
      setPlayerReady(false)
    }
    // Only run once on mount — isEnabled changes are handled imperatively above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle external isEnabled changes (e.g., preference loaded after mount)
  useEffect(() => {
    if (!playerRef.current || !playerReady) return
    if (isEnabled) {
      playerRef.current.unMute()
      // Only auto-play if user has interacted with the page
      if (hasInteracted.current) playerRef.current.playVideo()
    } else {
      playerRef.current.mute()
      playerRef.current.pauseVideo()
    }
  }, [isEnabled, playerReady])

  // Track first user interaction to unlock autoplay
  useEffect(() => {
    const onInteract = () => {
      if (hasInteracted.current) return
      hasInteracted.current = true
      if (isEnabled && playerRef.current && playerReady) {
        playerRef.current.playVideo()
      }
    }
    document.addEventListener('click', onInteract, { once: true })
    document.addEventListener('keydown', onInteract, { once: true })
    return () => {
      document.removeEventListener('click', onInteract)
      document.removeEventListener('keydown', onInteract)
    }
  }, [isEnabled, playerReady])

  return {
    isEnabled,
    toggleEnabled,
    currentTrackIndex,
    currentTrack: ARENA_TRACKS[currentTrackIndex],
    playerDivRef,
    playerReady,
  }
}
