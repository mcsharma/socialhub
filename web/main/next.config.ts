import path from 'node:path'
import { config as loadDotenv } from 'dotenv'
import type { NextConfig } from 'next'

// web/ — the pnpm workspace root.
const workspaceRoot = path.resolve(import.meta.dirname, '..')

// The whole web workspace shares ONE env file, web/.env (see .env.example) —
// web/db's prisma.config.ts loads the same file the same way. Next itself
// only auto-loads .env files from this package's folder (web/main), which
// still works for per-app overrides: dotenv never overwrites variables that
// are already set. (Next's own @next/env loader can't be used here — it
// caches the first directory it loaded and ignores later calls.)
loadDotenv({ path: path.join(workspaceRoot, '.env'), quiet: true })

const nextConfig: NextConfig = {
  // Next 16's explicit caching model: everything is dynamic (per-request) by
  // default; opt pieces into caching with 'use cache'. A static shell is
  // prerendered and dynamic parts stream in behind <Suspense>.
  cacheComponents: true,
  // Companion to cacheComponents: <Link> prefetches only the static shell of
  // the target route, not its dynamic holes. Next's recommended pairing for
  // new projects (both become the default in the next major).
  partialPrefetching: true,

  // Type-checks every <Link href> / router.push against the real route tree.
  typedRoutes: true,

  // @socialhub/db ships raw TypeScript (no build step) — let Next compile it
  // like app code, so edits there hot-reload just like edits here.
  transpilePackages: ['@socialhub/db'],

  // Watch/resolve the whole workspace, not just web/main, so changes in
  // sibling packages are picked up.
  turbopack: { root: workspaceRoot },
  outputFileTracingRoot: workspaceRoot,
}

export default nextConfig
