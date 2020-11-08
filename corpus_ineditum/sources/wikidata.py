from typing import List, Optional
from .base import BibliographicSource
from corpus_ineditum.core.models import Edition, Work, Author
from corpus_ineditum.utils.http import fetch_url
import logging

logger = logging.getLogger(__name__)

class Wikidata(BibliographicSource):
    @property
    def name(self) -> str:
        return "Wikidata"

    def _query_sparql(self, query: str) -> dict:
        url = "https://query.wikidata.org/sparql"
        headers = {
            "Accept": "application/sparql-results+json",
            "User-Agent": "CorpusIneditum/0.1 (Research Tool; https://github.com/lorenhey/corpus-ineditum)"
        }
        response = fetch_url(url, params={"query": query})
        # Wait... hishel get_client already sets User-Agent, but for Wikidata SPARQL we need exact accept header
        # Let's just use httpx directly for SPARQL if we need custom headers, or rely on fetch_url ignoring headers.
        # Let's adjust fetch_url or just use httpx directly here to be safe with Accept header.
        import httpx
        with httpx.Client(headers=headers) as client:
            res = client.get(url, params={"query": query}, timeout=30.0)
            res.raise_for_status()
            return res.json()

    def search_editions(self, title: str, author: Optional[str] = None, language: Optional[str] = None) -> List[Edition]:
        # Wikidata is better for Works than Editions, but we can do a basic search
        # Using wbsearchentities API
        return []

    def search_works_by_author(self, author_name: str) -> List[Work]:
        return []

    def get_author_authority(self, author_name: str) -> Optional[Author]:
        # Search for human (Q5) with given name
        url = "https://www.wikidata.org/w/api.php"
        params = {
            "action": "wbsearchentities",
            "search": author_name,
            "language": "en",
            "format": "json",
            "type": "item"
        }
        try:
            response = fetch_url(url, params=params)
            data = response.json()
            results = data.get("search", [])
            if not results:
                return None
                
            best_match = results[0]
            entity_id = best_match["id"]
            
            # Now fetch entity claims to get birth/death/VIAF
            query = f"""
            SELECT ?birthYear ?deathYear ?viaf WHERE {{
              wd:{entity_id} wdt:P31 wd:Q5 .
              OPTIONAL {{ wd:{entity_id} wdt:P569 ?birth . BIND(YEAR(?birth) AS ?birthYear) }}
              OPTIONAL {{ wd:{entity_id} wdt:P570 ?death . BIND(YEAR(?death) AS ?deathYear) }}
              OPTIONAL {{ wd:{entity_id} wdt:P214 ?viaf . }}
            }} LIMIT 1
            """
            try:
                sparql_res = self._query_sparql(query)
                bindings = sparql_res.get("results", {}).get("bindings", [])
                
                birth_year = None
                death_year = None
                viaf_id = None
                
                if bindings:
                    b = bindings[0]
                    if "birthYear" in b:
                        birth_year = int(b["birthYear"]["value"])
                    if "deathYear" in b:
                        death_year = int(b["deathYear"]["value"])
                    if "viaf" in b:
                        viaf_id = b["viaf"]["value"]
                        
                return Author(
                    name=best_match.get("label", author_name),
                    normalized_name=best_match.get("label", author_name),
                    birth_year=birth_year,
                    death_year=death_year,
                    wikidata_id=entity_id,
                    viaf_id=viaf_id
                )
                
            except Exception as e:
                logger.warning(f"Wikidata SPARQL failed: {e}")
                return Author(
                    name=best_match.get("label", author_name),
                    wikidata_id=entity_id
                )
                
        except Exception as e:
            logger.warning(f"Wikidata API failed: {e}")
            return None
