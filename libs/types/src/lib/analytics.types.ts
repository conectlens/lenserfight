export type TargetType = 'page' | 'thread' | 'lens' | 'profile' | 'tag'

export interface LogPageViewDTO {
  lenserId?: string | null
  userId?: string | null
  targetType: TargetType
  targetId?: string | null
  path: string
  referrer?: string | null
  userAgent: string
  clientIp?: string | null
}
