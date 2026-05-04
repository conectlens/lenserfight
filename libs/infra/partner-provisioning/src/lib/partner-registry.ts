import type { IPartnerProvider } from './partner-provider.interface'

export class PartnerRegistry {
  private readonly providers = new Map<string, IPartnerProvider>()

  register(provider: IPartnerProvider): void {
    this.providers.set(provider.name, provider)
  }

  get(name: string): IPartnerProvider {
    const provider = this.providers.get(name)
    if (!provider) throw new Error(`Unknown partner: ${name}`)
    return provider
  }

  list(): IPartnerProvider[] {
    return [...this.providers.values()]
  }

  has(name: string): boolean {
    return this.providers.has(name)
  }
}

export const partnerRegistry = new PartnerRegistry()
