"""Storage adapter interface."""
from abc import ABC, abstractmethod
from typing import BinaryIO


class StorageInterface(ABC):
    @abstractmethod
    def save(self, file: BinaryIO, path: str) -> str:
        """Save file content to path. Returns the storage path."""
        pass

    @abstractmethod
    def get(self, path: str) -> bytes:
        """Read file content from path."""
        pass

    @abstractmethod
    def delete(self, path: str) -> None:
        """Delete file at path."""
        pass
