# services

Standalone backend services that don't belong inside the `web/` TypeScript
workspace — e.g. a C++ offline feed generator, batch jobs, VM-hosted infra.
Each service gets its own folder here with its own toolchain.

Empty for now.

If a service writes rows into the shared Postgres, it either lets the
database mint IDs (`next_id()` column defaults) or mints its own Snowflake
IDs with a generator ID from the out-of-database range — see "IDs" in the
root README.
