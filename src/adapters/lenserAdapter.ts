import {
  LenserRepositoryPort,
  SupabaseLenserRepository,
} from '../repositories/lenserRepository'

export const getLenserRepository = (): LenserRepositoryPort => {
  return new SupabaseLenserRepository()
}
