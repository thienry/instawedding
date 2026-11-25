/** Runs a task, unless another tab is running it: then resolves to `null`. */
export async function runInOneTab<T>(id: string, run: () => Promise<T>): Promise<T | null> {
  // Missing in old browsers and outside HTTPS
  if (!navigator.locks) return run()
  let result: T | null = null
  await navigator.locks.request(
    `instawedding-upload-${id}`,
    { ifAvailable: true },
    async (lock) => {
      if (lock) result = await run()
    }
  )
  return result
}
