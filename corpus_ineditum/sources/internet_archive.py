from typing import List, Optional
from .base import BibliographicSource
from corpus_ineditum.core.models import Edition, Work, Author
from corpus_ineditum.utils.http import fetch_url
import logging

logger = logging.getLogger(__name__)

class InternetArchive(BibliographicSource):
    @property
    def name(self) -> str:
        return "Internet Archive"

    def search_editions(self, title: str, author: Optional[str] = None, language: Optional[str] = None) -> List[Edition]:
        """Search Internet Archive."""
        
        # Build Lucene query
        query_parts = [f'title:({title})']
        if author:
            query_parts.append(f'creator:({author})')
        if language:
            # IA usually uses 3 letter codes, but might be inconsistent. We'll search language field.
            query_parts.append(f'language:({language})')
            
        query_parts.append('mediatype:(texts)')
            
        query = " AND ".join(query_parts)
        
        params = {
            "q": query,
            "fl": "identifier,title,creator,date,publisher,language",
            "output": "json",
            "rows": 20
        }
        
        url = "https://archive.org/advancedsearch.php"
        
        try:
            response = fetch_url(url, params=params)
            data = response.json()
        except Exception as e:
            logger.warning(f"InternetArchive search failed: {e}")
            return []

        editions = []
        for doc in data.get("response", {}).get("docs", []):
            year = None
            date_str = doc.get("date")
            if date_str and len(date_str) >= 4:
                try:
                    year = int(date_str[:4])
                except ValueError:
                    pass
                    
            ed = Edition(
                edition_title=doc.get("title", ""),
                publication_year=year,
                publisher=doc.get("publisher"),
                language=doc.get("language"),
                identifiers={"internet_archive": doc.get("identifier", "")}
            )
            editions.append(ed)
            
        return editions

    def search_works_by_author(self, author_name: str) -> List[Work]:
        return []

    def get_author_authority(self, author_name: str) -> Optional[Author]:
        return None
