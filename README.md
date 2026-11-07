# AI Music Composer

Singer-aware music composition and production studio: sing a melody, get a professionally arranged
accompaniment. Not a karaoke app and not a generic text-to-song generator.

## Status

| Area | State |
|---|---|
| Design (docs/ARCHITECTURE.md) | Draft, awaiting review |
| Phase 1 Foundation | In progress, see PROJECT_STATUS.md |
| Voice analysis, composition, rendering, mixing, live mode | Planned only, nothing implemented |

Nothing in this repository yet analyses or generates audio. Features are listed as working only
once they are implemented and tested.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for architecture, data model, API contracts and milestones.

## Development

Requirements: Python 3.12 (via [uv](https://docs.astral.sh/uv/)), Node 22.

```bash
# API  (http://localhost:8000, docs at /docs)
cd api && uv sync && uv run uvicorn app.main:app --reload
uv run pytest -q && uv run ruff check .

# Web  (http://localhost:3000)
cd web && npm ci && npm run dev
npm test && npm run lint && npx tsc --noEmit && npm run build
```

Configuration (env vars, prefix `COMPOSER_`): `DATABASE_URL`, `STORAGE_DIR`, `MAX_UPLOAD_BYTES`, `CORS_ORIGINS`.
The web app reads `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`).

Current progress and what is verified: [PROJECT_STATUS.md](PROJECT_STATUS.md).
