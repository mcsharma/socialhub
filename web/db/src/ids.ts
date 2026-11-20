/**
 * Snowflake IDs — 64-bit, time-ordered, globally unique.
 *
 *   | 1 sign (0) | 41 bits: ms since EPOCH | 12 bits: generator ID | 10 bits: sequence |
 *
 * - 41 bits of milliseconds ≈ 69 years from EPOCH (until ~2095).
 * - 12-bit generator ID → 4096 independent generators. Ranges:
 *     0–2047     Postgres logical shards (the `next_id()` function; today only 0)
 *     2048–4095  out-of-database generators (services, workers, batch jobs)
 * - 10-bit sequence → 1024 IDs per millisecond per generator.
 *
 * The canonical generator is the Postgres function `next_id()` (see the
 * first migration in prisma/migrations), used as the column default for
 * every primary key. These constants MUST stay in sync with it.
 */
export const SNOWFLAKE_EPOCH_MS = 1767225600000n // 2026-01-01T00:00:00.000Z
export const GENERATOR_ID_BITS = 12n
export const SEQUENCE_BITS = 10n

const TIMESTAMP_SHIFT = GENERATOR_ID_BITS + SEQUENCE_BITS

/** Accepts the bigint form (domain tables) or the text form (auth tables). */
export function decodeSnowflake(id: bigint | string) {
  const n = typeof id === 'string' ? BigInt(id) : id
  const ms = (n >> TIMESTAMP_SHIFT) + SNOWFLAKE_EPOCH_MS
  return {
    createdAt: new Date(Number(ms)),
    generatorId: Number(
      (n >> SEQUENCE_BITS) & ((1n << GENERATOR_ID_BITS) - 1n),
    ),
    sequence: Number(n & ((1n << SEQUENCE_BITS) - 1n)),
  }
}

/** Parses an ID from untrusted input (URL segment, query param). */
export function parseSnowflake(raw: string | null | undefined): bigint | null {
  if (!raw || !/^\d{1,19}$/.test(raw)) return null
  const n = BigInt(raw)
  return n <= 0x7fffffffffffffffn ? n : null
}
