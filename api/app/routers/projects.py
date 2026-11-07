from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_session, get_storage
from app.models import Asset, Project
from app.schemas import (
    AssetOut,
    ProjectCreate,
    ProjectDetail,
    ProjectOut,
    ProjectUpdate,
)
from app.storage import AssetStorage, UnsupportedAudio, UploadTooLarge

router = APIRouter(tags=["projects"])
SessionDep = Annotated[Session, Depends(get_session)]


def _project_or_404(session: Session, project_id: str) -> Project:
    project = session.get(Project, project_id)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "project not found")
    return project


@router.post(
    "/projects", response_model=ProjectOut, status_code=status.HTTP_201_CREATED
)
def create_project(body: ProjectCreate, session: SessionDep) -> Project:
    project = Project(name=body.name.strip())
    session.add(project)
    session.commit()
    return project


@router.get("/projects", response_model=list[ProjectOut])
def list_projects(session: SessionDep) -> list[Project]:
    return list(session.scalars(select(Project).order_by(Project.updated_at.desc())))


@router.get("/projects/{project_id}", response_model=ProjectDetail)
def get_project(project_id: str, session: SessionDep) -> Project:
    return _project_or_404(session, project_id)


@router.patch("/projects/{project_id}", response_model=ProjectOut)
def rename_project(
    project_id: str, body: ProjectUpdate, session: SessionDep
) -> Project:
    project = _project_or_404(session, project_id)
    project.name = body.name.strip()
    session.commit()
    return project


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str,
    session: SessionDep,
    storage: Annotated[AssetStorage, Depends(get_storage)],
) -> None:
    project = _project_or_404(session, project_id)
    shas = {a.sha256 for a in project.assets}
    session.delete(project)
    session.commit()
    for sha in shas:
        in_use = (
            session.scalar(select(Asset.id).where(Asset.sha256 == sha).limit(1))
            is not None
        )
        storage.delete_if_unreferenced(sha, in_use)


@router.post(
    "/projects/{project_id}/vocal",
    response_model=AssetOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_vocal(
    project_id: str,
    request: Request,
    file: Annotated[UploadFile, File()],
    session: SessionDep,
    storage: Annotated[AssetStorage, Depends(get_storage)],
) -> Asset:
    project = _project_or_404(session, project_id)
    try:
        stored = await storage.save_upload(
            file, request.app.state.settings.max_upload_bytes
        )
    except UploadTooLarge:
        raise HTTPException(
            status.HTTP_413_CONTENT_TOO_LARGE, "file too large"
        ) from None
    except UnsupportedAudio:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "unsupported or empty audio (wav, flac, ogg, mp3, m4a, webm)",
        ) from None
    asset = Asset(
        project_id=project.id,
        kind="vocal",
        original_filename=(file.filename or "recording")[:255],
        content_type=stored.content_type,
        sha256=stored.sha256,
        size_bytes=stored.size_bytes,
        duration_s=stored.duration_s,
        immutable=True,
    )
    session.add(asset)
    project.updated_at = datetime.now(UTC)
    session.commit()
    return asset
