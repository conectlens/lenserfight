export interface ViewportPrefetchObserverOptions {
  rootMargin: string
  onIntersect: (assetId: string, element: Element) => void
}

export class ViewportPrefetchObserver {
  private observer: IntersectionObserver | null = null
  private readonly elements = new WeakMap<Element, string>()
  private readonly options: ViewportPrefetchObserverOptions

  constructor(options: ViewportPrefetchObserverOptions) {
    this.options = options
    if (typeof IntersectionObserver === 'undefined') return
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const assetId = this.elements.get(entry.target)
          if (!assetId) continue
          this.options.onIntersect(assetId, entry.target)
          this.observer?.unobserve(entry.target)
          this.elements.delete(entry.target)
        }
      },
      { rootMargin: options.rootMargin },
    )
  }

  observe(element: Element, assetId: string): void {
    if (!this.observer) return
    this.elements.set(element, assetId)
    this.observer.observe(element)
  }

  unobserve(element: Element): void {
    if (!this.observer) return
    this.observer.unobserve(element)
    this.elements.delete(element)
  }

  dispose(): void {
    this.observer?.disconnect()
    this.observer = null
  }
}
