interface QueuedJob {
  assetId: string
  attempts: number
  enqueuedAt: number
}

export interface BackgroundRefreshSchedulerOptions {
  maxConcurrency: number
  batchIntervalMs: number
  maxAttempts: number
  backoffBaseMs: number
  refresh: (assetId: string) => Promise<void>
  canRun?: () => boolean
}

export class BackgroundRefreshScheduler {
  private readonly queue: QueuedJob[] = []
  private readonly options: BackgroundRefreshSchedulerOptions
  private inFlight = 0
  private timer: ReturnType<typeof setTimeout> | null = null
  private disposed = false

  constructor(options: BackgroundRefreshSchedulerOptions) {
    this.options = options
  }

  enqueue(assetId: string): void {
    if (this.disposed) return
    if (this.queue.some((job) => job.assetId === assetId)) return
    this.queue.push({ assetId, attempts: 0, enqueuedAt: Date.now() })
    this.schedule()
  }

  dispose(): void {
    this.disposed = true
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.queue.length = 0
  }

  private schedule(): void {
    if (this.timer || this.disposed) return
    this.timer = setTimeout(() => {
      this.timer = null
      this.drain()
    }, this.options.batchIntervalMs)
  }

  private async drain(): Promise<void> {
    if (this.disposed) return
    if (this.options.canRun && !this.options.canRun()) {
      this.schedule()
      return
    }
    while (this.inFlight < this.options.maxConcurrency && this.queue.length > 0) {
      const job = this.queue.shift()
      if (!job) break
      this.inFlight++
      this.runJob(job)
    }
    if (this.queue.length > 0) this.schedule()
  }

  private async runJob(job: QueuedJob): Promise<void> {
    try {
      await this.options.refresh(job.assetId)
    } catch {
      job.attempts += 1
      if (job.attempts < this.options.maxAttempts) {
        const delay = this.options.backoffBaseMs * 2 ** (job.attempts - 1)
        setTimeout(() => {
          if (this.disposed) return
          this.queue.push(job)
          this.schedule()
        }, delay)
      }
    } finally {
      this.inFlight = Math.max(0, this.inFlight - 1)
      if (this.queue.length > 0) this.schedule()
    }
  }
}
