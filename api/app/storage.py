"""Content-addressed, write-once asset storage.

Original recordings are never modified: a file is written once under its sha256 and made read-only.
"""

import hashlib
import os
import tempfile
import wave
from dataclasses import dataclass
from pathlib import Path

from fastapi import UploadFile

CHUNK = 1024 * 1024

# (signature test, canonical content type). Sniffed from bytes; the client-supplied type is not trusted.
_SNIFFERS = (
    (lambda h: h[:4] == b"RIFF" and h[8:12] == b"WAVE", "audio/wav"),
    (lambda h: h[:4] == b"fLaC", "audio/flac"),
    (lambda h: h[:4] == b"OggS", "audio/ogg"),
    (
        lambda h: (
            h[:3] == b"ID3" or (len(h) > 1 and h[0] == 0xFF and (h[1] & 0xE0) == 0xE0)
        ),
        "audio/mpeg",
    ),
    (lambda h: h[4:8] == b"ftyp", "audio/mp4"),
    (lambda h: h[:4] == b"\x1a\x45\xdf\xa3", "audio/webm"),
)


class UploadTooLarge(Exception):
    pass


class UnsupportedAudio(Exception):
    pass


@dataclass(frozen=True)
class StoredFile:
    sha256: str
    size_bytes: int
    content_type: str
    duration_s: float | None


def sniff_audio_type(header: bytes) -> str | None:
    for test, content_type in _SNIFFERS:
        if test(header):
            return content_type
    return None


class AssetStorage:
    def __init__(self, root: Path):
        self.root = root
        (root / "assets").mkdir(parents=True, exist_ok=True)
        (root / "tmp").mkdir(parents=True, exist_ok=True)

    def path_for(self, sha256: str) -> Path:
        return self.root / "assets" / sha256[:2] / sha256

    async def save_upload(self, upload: UploadFile, max_bytes: int) -> StoredFile:
        digest = hashlib.sha256()
        size = 0
        header = b""
        fd, tmp_name = tempfile.mkstemp(dir=self.root / "tmp")
        tmp = Path(tmp_name)
        try:
            with os.fdopen(fd, "wb") as out:
                while chunk := await upload.read(CHUNK):
                    if not header:
                        header = chunk[:16]
                    size += len(chunk)
                    if size > max_bytes:
                        raise UploadTooLarge
                    digest.update(chunk)
                    out.write(chunk)
            content_type = sniff_audio_type(header)
            if size == 0 or content_type is None:
                raise UnsupportedAudio
            sha = digest.hexdigest()
            dest = self.path_for(sha)
            if dest.exists():
                tmp.unlink()  # identical content already stored; never rewrite it
            else:
                dest.parent.mkdir(parents=True, exist_ok=True)
                tmp.chmod(0o444)
                tmp.replace(dest)
            return StoredFile(
                sha,
                size,
                content_type,
                _wav_duration(dest) if content_type == "audio/wav" else None,
            )
        finally:
            tmp.unlink(missing_ok=True)

    def delete_if_unreferenced(self, sha256: str, still_referenced: bool) -> None:
        if not still_referenced:
            self.path_for(sha256).unlink(missing_ok=True)


def _wav_duration(path: Path) -> float | None:
    try:
        with wave.open(str(path), "rb") as w:
            rate = w.getframerate()
            return w.getnframes() / rate if rate else None
    except (wave.Error, EOFError):
        return None  # e.g. float WAV the stdlib cannot parse; real decoding arrives with Phase 2
