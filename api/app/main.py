import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings, get_settings
from app.db import Database
from app.routers import assets, projects
from app.storage import AssetStorage

logger = logging.getLogger("composer")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    settings.storage_dir.mkdir(parents=True, exist_ok=True)
    db = Database(settings.database_url)
    storage = AssetStorage(settings.storage_dir)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        db.create_all()
        logger.info("storage at %s", settings.storage_dir.resolve())
        yield

    app = FastAPI(title="AI Music Composer API", version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.state.settings = settings
    app.state.db = db
    app.state.storage = storage
    app.include_router(projects.router, prefix="/v1")
    app.include_router(assets.router, prefix="/v1")

    @app.get("/healthz")
    def healthz() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app() if __name__ != "__main__" else None
