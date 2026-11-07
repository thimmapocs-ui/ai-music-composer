# ADR 0001: Immutable, content-addressed storage for originals
Status: accepted (Phase 1)

**Context.** The singer's original take is the source of truth for every analysis and arrangement. Re-analysis with a better model must reproduce earlier results.

**Decision.** Files are stored once under `assets/<sha256[:2]>/<sha256>`, written via temp file then atomic rename, mode 0444, never overwritten. The database references them by hash. Identical uploads share one file; deleting a project removes a file only when no other asset references it. Content type is sniffed from bytes, not trusted from the client.

**Consequences.** Reproducibility and safe dedup. Edits (trim, denoise) must create new assets, never modify originals. Storage is behind `AssetStorage` so S3/MinIO can replace the local disk.
