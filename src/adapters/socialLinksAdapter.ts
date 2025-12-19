import { isMock } from '../config/runtimeConfig'
import {
  SocialLinksRepositoryPort,
  MockSocialLinksRepository,
  SupabaseSocialLinksRepository,
} from '../repositories/socialLinksRepository'

export const getSocialLinksRepository = (): SocialLinksRepositoryPort => {
  if (isMock) {
    return new MockSocialLinksRepository()
  }
  return new SupabaseSocialLinksRepository()
}
