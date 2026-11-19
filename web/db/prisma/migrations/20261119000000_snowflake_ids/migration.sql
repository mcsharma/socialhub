-- Snowflake ID generator, used as the DEFAULT for every primary key.
-- Hand-written migration (Prisma doesn't model functions); it must run before
-- any table that references next_id() in a column default.
--
--   | 1 sign (0) | 41 bits: ms since epoch | 12 bits: generator ID | 10 bits: sequence |
--
-- Keep in sync with web/db/src/ids.ts. See the "IDs" section of the root
-- README for the generator-ID ranges.
--
-- generator_id is this database's logical-shard number (0–2047 are reserved
-- for Postgres shards). A future shard gets its own copy of this function
-- with a different constant, set when that shard is provisioned.
--
-- The sequence wraps every 1024 values, so a single generator can mint at
-- most 1024 IDs per millisecond (~1M/s) before risking a collision — which
-- the primary-key constraint would reject rather than silently accept.

CREATE SEQUENCE snowflake_seq;

CREATE FUNCTION next_id() RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  epoch_ms     CONSTANT bigint := 1767225600000; -- 2026-01-01T00:00:00Z
  generator_id CONSTANT bigint := 0;
  now_ms       bigint;
  seq          bigint;
BEGIN
  now_ms := floor(extract(epoch FROM clock_timestamp()) * 1000);
  seq    := nextval('snowflake_seq') % 1024;
  RETURN ((now_ms - epoch_ms) << 22) | (generator_id << 10) | seq;
END;
$$;
