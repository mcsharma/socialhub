// Runs once when a Next.js server process starts (dev and prod). This file
// is compiled for every runtime, so Node-only code lives in
// instrumentation-node.ts and is imported only on the Node.js runtime.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertDatabaseReachable, ensureDevStorage } =
      await import('./instrumentation-node')
    await assertDatabaseReachable()
    await ensureDevStorage()
  }
}
