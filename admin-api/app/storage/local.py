"""Local filesystem storage implementation."""
import os
from pathlib import Path
from typing import BinaryIO

from app.storage.interface import StorageInterface


class LocalStorage(StorageInterface):
    def __init__(self, base_path: str = "./uploads"):
        self.base_path = Path(base_path)

    def _full_path(self, path: str) -> Path:
        return self.base_path / path.lstrip("/")

    def save(self, file: BinaryIO, path: str) -> str:
        full = self._full_path(path)
        full.parent.mkdir(parents=True, exist_ok=True)
        with open(full, "wb") as f:
            f.write(file.read())
        return path

    def get(self, path: str) -> bytes:
        full = self._full_path(path)
        with open(full, "rb") as f:
            return f.read()

    def delete(self, path: str) -> None:
        full = self._full_path(path)
        if full.exists():
            full.unlink()
