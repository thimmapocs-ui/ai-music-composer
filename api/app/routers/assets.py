from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.deps import get_session, get_storage
from app.models import Asset
from app.storage import AssetStorage

router = APIRouter(tags=["assets"])


@router.get("/assets/{asset_id}/content")
def asset_content(
    asset_id: str,
    session: Annotated[Session, Depends(get_session)],
    storage: Annotated[AssetStorage, Depends(get_storage)],
) -> FileResponse:
    asset = session.get(Asset, asset_id)
    path = storage.path_for(asset.sha256) if asset else None
    if asset is None or path is None or not path.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "asset not found")
    # FileResponse serves HTTP Range requests, which browser <audio> seeking needs.
    return FileResponse(
        path, media_type=asset.content_type, filename=asset.original_filename
    )
