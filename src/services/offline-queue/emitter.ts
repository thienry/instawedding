/** Set of listeners called together. */
export class Emitter<T extends readonly unknown[]> {
  private readonly listeners = new Set<(...args: T) => void>()

  /** @returns Stops listening. */
  add(listener: (...args: T) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  emit(...args: T): void {
    for (const listener of this.listeners) listener(...args)
  }
}
