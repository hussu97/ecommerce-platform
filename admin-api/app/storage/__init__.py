"""File storage adapters for bulk uploads and templates."""
from app.storage.interface import StorageInterface
from app.storage.local import LocalStorage


def get_storage() -> StorageInterface:
    from app.core.config import settings
    if settings.STORAGE_BACKEND == "local":
        return LocalStorage(base_path=settings.STORAGE_PATH)
    raise ValueError(f"Unknown storage backend: {settings.STORAGE_BACKEND}")
