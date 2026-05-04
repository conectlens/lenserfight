/**
 * Returns a Proxy that satisfies any repository port interface in file-storage mode.
 * Every method logs a warning and returns Promise<[]> (or a safe empty value).
 * Use for the 30 repositories that have no file-mode implementation yet.
 */
export function fileModeStub<T extends object>(repoName: string): T {
  return new Proxy({} as T, {
    get(_target, method: string | symbol) {
      if (typeof method === 'symbol') return undefined
      return (..._args: unknown[]) => {
        console.warn(
          `[file mode] ${repoName}.${method}() is not available in file-storage mode — returning empty stub`
        )
        return Promise.resolve([])
      }
    },
  })
}
