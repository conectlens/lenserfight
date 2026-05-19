import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Stub preferencesService so no real HTTP calls are made
vi.mock('@lenserfight/data/repositories', () => ({
  preferencesService: {
    updatePreferences: vi.fn().mockResolvedValue(undefined),
  },
}))

// Stub YouTube IFrame API loading — we don't want real script injection
vi.stubGlobal('YT', undefined)

// Capture injected script so we can trigger onYouTubeIframeAPIReady manually
const appendedScripts: HTMLScriptElement[] = []
const origAppendChild = document.head.appendChild.bind(document.head)
vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
  if ((node as HTMLScriptElement).src?.includes('youtube')) {
    appendedScripts.push(node as HTMLScriptElement)
  }
  return origAppendChild(node)
})

// Minimal YT.Player stub
const mockPlayer = {
  playVideo: vi.fn(),
  pauseVideo: vi.fn(),
  mute: vi.fn(),
  unMute: vi.fn(),
  loadVideoById: vi.fn(),
  destroy: vi.fn(),
}

function installYTStub() {
  const YTPlayerCtor = vi.fn().mockImplementation((_el: unknown, opts: { events: { onReady: (e: unknown) => void; onStateChange: (e: unknown) => void } }) => {
    // Immediately call onReady so playerReady becomes true
    opts.events.onReady({ target: mockPlayer })
    return mockPlayer
  })
  vi.stubGlobal('YT', {
    Player: YTPlayerCtor,
    PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 },
  })
}

// Mock localStorage
const localStorageStore: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (k: string) => localStorageStore[k] ?? null,
  setItem: (k: string, v: string) => { localStorageStore[k] = v },
  removeItem: (k: string) => { delete localStorageStore[k] },
  clear: () => { Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]) },
})

// ---------------------------------------------------------------------------
// Import after mocks are established
// ---------------------------------------------------------------------------
import { useArenaMusic, ARENA_TRACKS } from './useArenaMusic'
import { preferencesService } from '@lenserfight/data/repositories'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useArenaMusic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k])
    appendedScripts.length = 0
    installYTStub()
    // Reset module-level ytApiLoaded flag by reinstalling the YT stub fresh each time
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exports exactly 4 arena tracks', () => {
    expect(ARENA_TRACKS).toHaveLength(4)
  })

  it('each track has a non-empty id and title', () => {
    for (const track of ARENA_TRACKS) {
      expect(track.id).toBeTruthy()
      expect(track.title).toBeTruthy()
    }
  })

  it('defaults isEnabled to true when no localStorage value exists', () => {
    const { result } = renderHook(() =>
      useArenaMusic({ isAuthenticated: false }),
    )
    expect(result.current.isEnabled).toBe(true)
  })

  it('reads isEnabled=false from localStorage for anonymous users', () => {
    localStorageStore['lenserfight:arena_music_enabled'] = 'false'
    const { result } = renderHook(() =>
      useArenaMusic({ isAuthenticated: false }),
    )
    expect(result.current.isEnabled).toBe(false)
  })

  it('prefers initialPreference prop over localStorage', () => {
    localStorageStore['lenserfight:arena_music_enabled'] = 'true'
    const { result } = renderHook(() =>
      useArenaMusic({ isAuthenticated: false }, false),
    )
    expect(result.current.isEnabled).toBe(false)
  })

  it('starts at track index 0', () => {
    const { result } = renderHook(() =>
      useArenaMusic({ isAuthenticated: false }),
    )
    expect(result.current.currentTrackIndex).toBe(0)
    expect(result.current.currentTrack).toEqual(ARENA_TRACKS[0])
  })

  it('toggleEnabled flips isEnabled and persists to localStorage for anon users', () => {
    const { result } = renderHook(() =>
      useArenaMusic({ isAuthenticated: false }),
    )
    act(() => { result.current.toggleEnabled() })
    expect(result.current.isEnabled).toBe(false)
    expect(localStorageStore['lenserfight:arena_music_enabled']).toBe('false')
  })

  it('toggleEnabled calls preferencesService for authenticated users', async () => {
    const { result } = renderHook(() =>
      useArenaMusic({ isAuthenticated: true }),
    )
    await act(async () => { result.current.toggleEnabled() })
    expect(preferencesService.updatePreferences).toHaveBeenCalledWith(
      expect.objectContaining({ autoplay_music: false }),
    )
  })

  it('toggleEnabled does NOT call preferencesService for anonymous users', async () => {
    const { result } = renderHook(() =>
      useArenaMusic({ isAuthenticated: false }),
    )
    await act(async () => { result.current.toggleEnabled() })
    expect(preferencesService.updatePreferences).not.toHaveBeenCalled()
  })

  it('returns a playerDivRef object', () => {
    const { result } = renderHook(() =>
      useArenaMusic({ isAuthenticated: false }),
    )
    expect(result.current.playerDivRef).toBeDefined()
    expect(typeof result.current.playerDivRef).toBe('object')
  })
})
