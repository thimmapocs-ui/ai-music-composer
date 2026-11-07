from collections.abc import Iterator

from fastapi import Request
from sqlalchemy.orm import Session

from app.storage import AssetStorage


def get_session(request: Request) -> Iterator[Session]:
    yield from request.app.state.db.session()


def get_storage(request: Request) -> AssetStorage:
    return request.app.state.storage
