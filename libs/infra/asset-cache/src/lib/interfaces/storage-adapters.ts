export interface IOpenCache {
  match(request: RequestInfo): Promise<Response | undefined>
  put(request: RequestInfo, response: Response): Promise<void>
  delete(request: RequestInfo): Promise<boolean>
  keys?(): Promise<readonly Request[]>
}

export interface ICacheStorageAdapter {
  open(cacheName: string): Promise<IOpenCache>
  delete(cacheName: string): Promise<boolean>
  keys(): Promise<string[]>
  has(cacheName: string): Promise<boolean>
}

export interface IIndexedDBAdapter {
  open(dbName: string, version: number, upgrade: (db: IDBDatabase) => void): Promise<IDBDatabase>
  close(db: IDBDatabase): void
}

export interface IServiceWorkerAdapter {
  register(scriptPath: string, scope: string): Promise<ServiceWorkerRegistration | null>
  unregister(): Promise<boolean>
  isSupported(): boolean
  getRegistration(): Promise<ServiceWorkerRegistration | null>
  postMessage(message: unknown): void
}
