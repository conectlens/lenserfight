import { isMock } from '../config/runtimeConfig'
import {
  LenserRepositoryPort,
  MockLenserRepository,
  SupabaseLenserRepository,
} from '../repositories/lenserRepository'

export const getLenserRepository = (): LenserRepositoryPort => {
  if (isMock) {
    return new MockLenserRepository()
  }
  return new SupabaseLenserRepository()
}
