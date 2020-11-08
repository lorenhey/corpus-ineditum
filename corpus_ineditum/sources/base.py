from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from corpus_ineditum.core.models import Edition, Work, Author

class BibliographicSource(ABC):
    """Abstract base class for bibliographic connectors."""
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the source (e.g., 'Open Library')"""
        pass

    @abstractmethod
    def search_editions(self, title: str, author: Optional[str] = None, language: Optional[str] = None) -> List[Edition]:
        """Search for editions matching title and optionally author/language."""
        pass

    @abstractmethod
    def search_works_by_author(self, author_name: str) -> List[Work]:
        """Find works by a specific author."""
        pass
    
    @abstractmethod
    def get_author_authority(self, author_name: str) -> Optional[Author]:
        """Try to resolve an author's name to an authority record."""
        pass
