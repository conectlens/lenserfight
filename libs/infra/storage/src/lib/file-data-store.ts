import { openDB, type IDBPDatabase } from 'idb'

type RecordWithId = { id: string }

/**
 * Generic IndexedDB-backed store for file-mode repositories.
 * Each instance owns one object store in its own IDB database.
 * Used by File*Repository implementations when DATA_SOURCE=file.
 */
export class FileDataStore<T extends RecordWithId> {
  private dbPromise: Promise<IDBPDatabase> | null = null
  private readonly dbName: string

  constructor(private readonly storeName: string) {
    this.dbName = `lf_data_${storeName}`
  }

  private getDb(): Promise<IDBPDatabase> {
    if (!this.dbPromise) {
      const { storeName } = this
      this.dbPromise = openDB(this.dbName, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' })
          }
        },
      })
    }
    return this.dbPromise
  }

  async findById(id: string): Promise<T | undefined> {
    const db = await this.getDb()
    return db.get(this.storeName, id) as Promise<T | undefined>
  }

  async findAll(): Promise<T[]> {
    const db = await this.getDb()
    return db.getAll(this.storeName) as Promise<T[]>
  }

  async findWhere(predicate: (item: T) => boolean): Promise<T[]> {
    const all = await this.findAll()
    return all.filter(predicate)
  }

  async save(record: T): Promise<void> {
    const db = await this.getDb()
    await db.put(this.storeName, record)
  }

  async saveMany(records: T[]): Promise<void> {
    const db = await this.getDb()
    const tx = db.transaction(this.storeName, 'readwrite')
    await Promise.all([...records.map((r) => tx.store.put(r)), tx.done])
  }

  async remove(id: string): Promise<void> {
    const db = await this.getDb()
    await db.delete(this.storeName, id)
  }

  async clear(): Promise<void> {
    const db = await this.getDb()
    await db.clear(this.storeName)
  }

  async count(): Promise<number> {
    const db = await this.getDb()
    return db.count(this.storeName)
  }
}
