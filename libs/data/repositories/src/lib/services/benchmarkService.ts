import {
  BenchmarkSuiteRecord,
  BenchmarkTaskRecord,
  InvalidationRecord,
  CreateBenchmarkSuiteInput,
  CreateBenchmarkTaskInput,
  InvalidateResultInput,
} from '@lenserfight/types'
import { SupabaseBenchmarkRepository } from '../repositories/benchmarkRepository'

const benchmarkRepo = new SupabaseBenchmarkRepository()

export const benchmarkService = {
  listSuites: (creatorLenserId?: string): Promise<BenchmarkSuiteRecord[]> =>
    benchmarkRepo.listSuites(creatorLenserId),

  getSuite: (suiteId: string): Promise<BenchmarkSuiteRecord | null> =>
    benchmarkRepo.getSuite(suiteId),

  getTasksBySuite: (suiteId: string): Promise<BenchmarkTaskRecord[]> =>
    benchmarkRepo.getTasksBySuite(suiteId),

  createSuite: (input: CreateBenchmarkSuiteInput, creatorLenserId: string): Promise<BenchmarkSuiteRecord> =>
    benchmarkRepo.createSuite(input, creatorLenserId),

  createTask: (input: CreateBenchmarkTaskInput): Promise<BenchmarkTaskRecord> =>
    benchmarkRepo.createTask(input),

  invalidateResult: (input: InvalidateResultInput, invalidatedBy: string): Promise<InvalidationRecord> =>
    benchmarkRepo.invalidateResult(input, invalidatedBy),
}
