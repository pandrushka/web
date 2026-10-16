export class BoundedPromiseCache<Value> {
  private readonly entries = new Map<string, { promise: Promise<Value>; expiresAt: number }>()
  private readonly maxEntries: number
  private readonly ttlMs: number

  constructor(maxEntries: number, ttlMs = Number.POSITIVE_INFINITY) {
    if (maxEntries < 1) throw new Error('Cache capacity must be positive')
    this.maxEntries = maxEntries
    this.ttlMs = ttlMs
  }

  getOrLoad(key: string, load: () => Promise<Value>) {
    const cached = this.entries.get(key)
    if (cached && cached.expiresAt > Date.now()) {
      this.entries.delete(key)
      this.entries.set(key, cached)
      return cached.promise
    }
    if (cached) this.entries.delete(key)

    const promise = load().catch((error: unknown) => {
      if (this.entries.get(key)?.promise === promise) this.entries.delete(key)
      throw error
    })
    this.entries.set(key, { promise, expiresAt: Date.now() + this.ttlMs })
    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value as string | undefined
      if (oldestKey === undefined) break
      this.entries.delete(oldestKey)
    }
    return promise
  }

  delete(key: string) {
    this.entries.delete(key)
  }

  deleteWhere(predicate: (key: string) => boolean) {
    for (const key of this.entries.keys()) if (predicate(key)) this.entries.delete(key)
  }

  clear() {
    this.entries.clear()
  }

  get size() {
    return this.entries.size
  }
}
