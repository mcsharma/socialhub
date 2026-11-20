# Claude notes

## Stack

Next.js 16 (App Router, Turbopack, Cache Components) · React 19 · TypeScript 6
· Prisma 7 + Postgres · Better Auth (email/password + Google) · SWR · Tailwind
v4 + Base UI/9ui (same design tokens as web-monorepo-scaffolding) · Zod ·
ESLint 10 · pnpm 11.

## Quick start

Prerequisites: Node ≥ 24, Docker, and pnpm via corepack (`packageManager` in
`web/package.json` pins the version).

```sh
docker compose up -d              # 1. Postgres on localhost:5433
cp web/.env.example web/.env      # 2. defaults work as-is for local dev
cd web && pnpm install            # 3. also runs `prisma generate`
pnpm run db:migrate               # 4. apply migrations
pnpm run db:seed                  # 5. demo circles, users, posts
pnpm run dev                      # 6. http://localhost:3000
```

Log in as `alice@example.com` / `password123` (also `bob@…`, `carol@…` in the
"Friends" circle; `dave@…`, `erin@…` in "Book club"), or create an account. Google sign-in appears once `GOOGLE_CLIENT_ID` /
`GOOGLE_CLIENT_SECRET` are set in `web/.env`.

## Scripts (run from `web/`)

| Script                  | Does                                                               |
| ----------------------- | ------------------------------------------------------------------ |
| `pnpm run dev`          | `next dev` + a `tsc --watch` typecheck, side by side               |
| `pnpm run build`        | Production build (`next build`)                                    |
| `pnpm run start`        | Serve the production build                                         |
| `pnpm run typecheck`    | `tsc --noEmit` in every package (main runs `next typegen` first)   |
| `pnpm run lint` / `lint:fix` | ESLint in every package (one shared `web/eslint.config.js`)   |
| `pnpm run db:migrate`   | `prisma migrate dev` — create + apply a migration from schema edits |
| `pnpm run db:generate`  | Regenerate the Prisma client                                       |
| `pnpm run db:seed`      | Re-create demo circles, users, posts, reactions, comments (idempotent) |
| `pnpm run db:reset`     | Drop + re-apply all migrations (destructive)                       |
| `pnpm run db:studio`    | Prisma Studio                                                      |

## Architecture

### Data flow — no separate BFF

Next.js is both the frontend and the backend-for-frontend. Instead of
GraphQL, there are three server entry points, all going through one
data-access layer:

```
                         ┌──────────────── web/main ────────────────┐
 Server Components ──┐   │                                          │
 Server Actions ─────┼──►│ src/lib/dal/*  (session, permissions,    │──► @socialhub/db ──► Postgres
 Route Handlers ─────┘   │   React cache(), 'use cache', → DTOs)    │    (pure queries)
   (/api/*, for SWR)     └──────────────────────────────────────────┘
```

- **`web/db` is framework-free.** Plain arguments in, rows out. No Next/React
  imports — pnpm's strict `node_modules` makes such imports fail to resolve,
  because `web/db` doesn't depend on them. That keeps it reusable from any future TS
  process (a WebSocket server, job workers, scripts).
- **`web/main/src/lib/dal/` is request-aware.** It resolves the viewer from
  the session, applies permissions/caching, and converts rows to **DTOs**
  (`lib/dal/dto.ts`). Only DTOs cross to the client: BigInt IDs → decimal
  strings, Dates → ISO strings, only the fields the UI needs.
- **`web/db` ships raw TypeScript** (`exports: ./src/index.ts`) compiled by
  Next via `transpilePackages`, so edits there hot-reload like app code. No
  build step, nothing published (`workspace:*` always resolves locally).
- **Import from `@socialhub/db` only**, never from its internal files.

### Rendering — Cache Components

`cacheComponents: true` in `web/main/next.config.ts`: everything is dynamic
(per request) unless explicitly cached with `'use cache'`. Each page gets a
prerendered **static shell**; dynamic parts **stream** in behind
`<Suspense>`. Rule of thumb: anything that reads cookies/headers/params or
queries the DB uncached must sit inside a `<Suspense>` boundary — `next
build` fails loudly if it doesn't.

Which tool to reach for:

| Need | Pattern |
| --- | --- |
| Content with no per-request data | Leave it outside `<Suspense>`: it's prerendered into the static shell (e.g. the nav frame, `/login`) |
| Per-request data (session, params, uncached DB reads) | Render it inside `<Suspense>`; it streams in. A DB read that touches no request API needs `await connection()` |
| Data shared by all viewers that changes rarely | `'use cache'` + `cacheTag`/`cacheLife`; invalidate with `updateTag` after a write |
| First page on the server, more in the browser | Server-render page 1, pass it to a Client Component using SWR `useSWRInfinite` with `fallbackData`; later pages come from a Route Handler |
| Writes from forms | Server Action + `useActionState`; then `updateTag` and/or SWR `mutate()` |

Note: `notFound()` inside a streamed `<Suspense>` boundary renders the
not-found UI with HTTP **200** (the shell's status is already sent) plus a
`<meta name="robots" content="noindex">` — expected with streaming.

### Auth — Better Auth

- Config: `web/main/src/lib/auth.ts`; endpoints at `/api/auth/*`; browser
  client: `lib/auth-client.ts`.
- Server Components read the viewer via `getViewer()`
  (`lib/dal/session.ts`, deduped per request). Server Actions must
  re-check auth themselves — they're public HTTP endpoints.
- Tables (`users`, `sessions`, `accounts`, `verifications`) live in
  `web/db/prisma/schema.prisma`. Better Auth talks to Prisma by
  model/field name — keep those names as Better Auth expects; columns/tables
  are mapped to our snake_case conventions.
- `username` is an extra user field, derived from the email at sign-up
  (`databaseHooks` in `auth.ts`); clients can't set it.

### Environment

**One env file for the workspace: `web/.env`** (template:
`web/.env.example`). `web/db/prisma.config.ts` and `web/main/next.config.ts`
both load it with dotenv, which never overrides already-set variables — so
real environment variables (prod) win, and `web/main/.env.local` still works
for app-only overrides.

## IDs

Every primary key is a **Snowflake ID**: 64-bit, time-ordered, globally
unique, compact in URLs (e.g. `/posts/116808394517512231`).

```
| 1 sign (0) | 41 bits: ms since 2026-01-01Z | 12 bits: generator ID | 10 bits: sequence |
               ~69 years                        4096 generators          1024 IDs/ms each
```

- Minted by the Postgres function **`next_id()`** (first migration,
  `web/db/prisma/migrations/20261119000000_snowflake_ids/`) as the column
  default — so Prisma, raw SQL and any other writer get IDs automatically.
  Constants are mirrored in `web/db/src/ids.ts` (`decodeSnowflake`,
  `parseSnowflake`); keep them in sync.
- **Domain tables** (posts, …) store it as `BIGINT`. **Better Auth's tables**
  store the same value as `TEXT`, because Better Auth JSON-serializes those
  rows and JS `BigInt` isn't JSON-serializable. It's configured with
  `generateId: false`, so it defers to the column default.
- Time-ordered ⇒ `ORDER BY id DESC` is newest-first and `WHERE id < :cursor`
  is keyset pagination, no separate timestamp index needed.

**Generator ID ranges** — no two live generators may share one:

| Range     | Owner |
| --------- | ----- |
| 0–2047    | Postgres logical shards — the constant inside each shard's `next_id()`. Today only **0**. |
| 2048–4095 | Out-of-database generators (services, workers, batch jobs) — from config (`GENERATOR_ID`) or leased from a registry at startup. |

New tables: `id BigInt @id @default(dbgenerated("next_id()"))`.

## Data model

Tables are documented in `web/db/prisma/schema.prisma`. The main rules:

- **Circles are secret.** A circle's posts are visible only to its members,
  so every circle read and write must check membership in `web/main/src/lib/dal/`.
  Non-members get "not found", never "forbidden", so nothing reveals that a
  circle exists.
- **One circle per user is a product rule, not a schema rule.** The schema
  allows many; the app enforces one for now.
- **All members are equal.** Any member can add someone; `added_by_id`
  records who did.
- **Counts are maintained by Postgres triggers.** `posts.reaction_count` and
  `posts.comment_count` are updated by triggers on `post_reactions` and
  `comments` (in the `circles_reactions_comments` migration). App code never
  writes them.
- **Photos** are processed at upload (EXIF stripped, rotated, resized to fixed
  WebP sizes) and stored in object storage under random keys: R2 in
  production, SeaweedFS in `docker-compose` for development (not set up yet).
  Up to 10 per post.
- **Extending later:** reactions on comments get their own
  `comment_reactions` table with the same `ReactionType`; replies add a
  nullable `parent_id` to `comments`; videos add a `MediaKind`.

## Working with the database

1. Edit `web/db/prisma/schema.prisma`.
2. `pnpm run db:migrate --name <what_changed>` (from `web/`) — creates
   `prisma/migrations/<timestamp>_<name>/` and applies it.
   For SQL Prisma can't express (functions, triggers), use
   `pnpm --filter @socialhub/db migrate:create --name <x>`, edit the
   generated SQL, then `pnpm run db:migrate`.
3. Add/adjust query functions in `web/db/src/queries/` and export them from
   `web/db/src/index.ts`; wrap them in `web/main/src/lib/dal/`.
4. Commit `schema.prisma` and the migration folder together. The generated
   Prisma client (`web/db/src/__generated__/`) is gitignored — it's
   regenerated on every `pnpm install`.

## Version notes

Dependencies track the latest stable releases, with these deliberate
exceptions:

- **TypeScript 6.0**, not 7.x — `typescript-eslint` (used by Next's lint
  config) supports `< 6.1`.
- **Prisma 7.x** — npm's `latest` tag points at an 8.0 release candidate.
- **ESLint 10** with Next's lint config: three of its plugins
  (`import`, `jsx-a11y`, `react`) haven't widened their peer range past
  ESLint 9 (now EOL) yet. Their rules were verified to run under 10; the
  overrides are in `web/pnpm-workspace.yaml` → `peerDependencyRules`.
- pnpm 11 refuses packages published less than a day ago
  (`minimumReleaseAge`); if `pnpm install` wants to add
  `minimumReleaseAgeExclude` entries, prefer pinning the previous release.
- `web/main/AGENTS.md` is generated and kept up to date by `next dev`
  (points AI coding agents at the version-matched docs in
  `node_modules/next/dist/docs/`). Commit it as-is.
