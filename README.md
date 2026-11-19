# socialhub

A new social media for close friends, without the clutter of public content.

Monorepo: everything web lives in `web/` (a pnpm
workspace); non-web backends (e.g. a C++ offline feed generator) go in
`services/`, each with its own toolchain.

| Path        | What it is                                                                   |
| ----------- | ---------------------------------------------------------------------------- |
| `web/main`  | `@socialhub/main` — the Next.js 16 app (App Router): pages, API routes, auth |
| `web/db`    | `@socialhub/db` — Prisma schema, migrations, seed, client, pure query functions |
| `services/` | Standalone non-TS services. Empty for now.                                  |
| `docker-compose.yml` | Local Postgres on port **5433**                                    |
