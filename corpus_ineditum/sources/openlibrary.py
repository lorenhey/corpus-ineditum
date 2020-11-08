from typing import List, Optional, Dict, Any
from .base import BibliographicSource
from corpus_ineditum.core.models import Edition, Work, Author, WorkType
from corpus_ineditum.utils.http import fetch_url
import logging

logger = logging.getLogger(__name__)

class OpenLibrary(BibliographicSource):
    @property
    def name(self) -> str:
        return "Open Library"

    def search_editions(self, title: str, author: Optional[str] = None, language: Optional[str] = None) -> List[Edition]:
        """Search Open Library for editions."""
        params = {"title": title}
        if author:
            params["author"] = author
        if language:
            # OL uses 3 letter codes sometimes, but 'spa' or 'fre'. 
            # We'll just pass it to 'language' query param, maybe better to just use 'q'.
            params["language"] = language
            
        url = "https://openlibrary.org/search.json"
        try:
            response = fetch_url(url, params=params)
            data = response.json()
        except Exception as e:
            logger.warning(f"OpenLibrary search failed: {e}")
            return []

        editions = []
        for doc in data.get("docs", [])[:20]:  # Limit to top 20
            ed = Edition(
                edition_title=doc.get("title", ""),
                publication_year=self._extract_year(doc.get("first_publish_year") or doc.get("publish_year", [None])[0]),
                publisher=doc.get("publisher", [""])[0] if doc.get("publisher") else None,
                language=doc.get("language", [""])[0] if doc.get("language") else None,
                identifiers={"openlibrary": doc.get("key", "")}
            )
            editions.append(ed)
        return editions

    def search_works_by_author(self, author_name: str) -> List[Work]:
        params = {"author": author_name}
        url = "https://openlibrary.org/search.json"
        try:
            response = fetch_url(url, params=params)
            data = response.json()
        except Exception as e:
            logger.warning(f"OpenLibrary author search failed: {e}")
            return []
            
        works = []
        for doc in data.get("docs", [])[:20]:
            work = Work(
                canonical_title=doc.get("title", ""),
                estimated_first_publication_year=self._extract_year(doc.get("first_publish_year")),
                work_type=WorkType.BOOK,
                subjects=doc.get("subject", [])[:5]
            )
            works.append(work)
        return works

    def get_author_authority(self, author_name: str) -> Optional[Author]:
        url = "https://openlibrary.org/search/authors.json"
        params = {"q": author_name}
        try:
            response = fetch_url(url, params=params)
            data = response.json()
        except Exception as e:
            logger.warning(f"OpenLibrary author authority failed: {e}")
            return None
            
        if data.get("docs"):
            doc = data["docs"][0]
            return Author(
                name=doc.get("name", author_name),
                birth_year=self._extract_year(doc.get("birth_date")),
                death_year=self._extract_year(doc.get("death_date")),
                normalized_name=doc.get("name", author_name)
            )
        return None
        
    def _extract_year(self, year_raw: Any) -> Optional[int]:
        if not year_raw:
            return None
        try:
            # Handle strings like '1897' or '1897?'
            if isinstance(year_raw, str):
                import re
                match = re.search(r'\d{4}', year_raw)
                if match:
                    return int(match.group())
                return None
            return int(year_raw)
        except (ValueError, TypeError):
            return None
