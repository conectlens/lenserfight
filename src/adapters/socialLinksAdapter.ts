import {
  SocialLinksRepositoryPort,
  SupabaseSocialLinksRepository,
} from '../repositories/socialLinksRepository'

export const getSocialLinksRepository = (): SocialLinksRepositoryPort => {
  return new SupabaseSocialLinksRepository()
}
