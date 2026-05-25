export type MainTab = 'threads' | 'lenses' | 'tags' | 'battles' | 'profile'

export type MobileRoute =
  | { name: 'login' }
  | { name: 'magicLink' }
  | { name: 'register' }
  | { name: 'main'; tab: MainTab }
  | { name: 'threadDetail'; id: string; title?: string }
  | { name: 'lensDetail'; id: string; title?: string }
  | { name: 'tagDetail'; slug: string; title?: string }
  | { name: 'battleDetail'; id: string; title?: string }

export interface MobileNavigator {
  route: MobileRoute
  goLogin: () => void
  goMagicLink: () => void
  goRegister: () => void
  goTab: (tab: MainTab) => void
  goThread: (id: string, title?: string) => void
  goLens: (id: string, title?: string) => void
  goTag: (slug: string, title?: string) => void
  goBattle: (id: string, title?: string) => void
  goBack: () => void
}
