# ADR 0004: SQLite for Phase 1
Status: accepted, to be revisited

SQLAlchemy 2 models with a configurable URL. SQLite removes setup cost for development. Postgres is the target (see ARCHITECTURE.md) and must be tested in CI before Phase 3, when jobs and versions make concurrency matter.
