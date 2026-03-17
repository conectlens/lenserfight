export type PaginationMode = 'infinite' | 'numbered'

/**
 * GRASP Polymorphism — common interface for both infinite-scroll and numbered pagination.
 * Consumers depend only on this interface; the concrete strategy (infinite vs numbered)
 * is injected via `usePaginationController`.
 */
export interface IPaginationStrategy {
  mode: PaginationMode
  currentOffset: number
  limit: number
  total?: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  /** 1-indexed */
  currentPage: number
  totalPages?: number
  goToNextPage(): void
  goToPreviousPage(): void
  goToPage(page: number): void
  reset(): void
}
