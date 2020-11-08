import logging
from typing import List
from corpus_ineditum.core.models import Work, Author, WorkType, ObscurityLabel, PublicDomainStatus
from corpus_ineditum.sources.wikidata import Wikidata
from corpus_ineditum.audit.auditor import TranslationAuditor

logger = logging.getLogger(__name__)

class DiscoveryEngine:
    def __init__(self):
        self.wikidata = Wikidata()
        self.auditor = TranslationAuditor()
        
    def discover_candidates(self, source_language_code: str, target_language_code: str, limit: int = 10) -> List[Work]:
        """
        Runs a discovery process to find untranslated works.
        """
        logger.info(f"Starting discovery: {source_language_code} -> {target_language_code}")
        
        # Map lang codes to Wikidata items (very basic mapping for demo)
        lang_map = {
            "de": "Q188",
            "fr": "Q150",
            "la": "Q397",
            "it": "Q119",
            "en": "Q1860"
        }
        
        wd_lang = lang_map.get(source_language_code)
        if not wd_lang:
            logger.error(f"Unsupported discovery language code: {source_language_code}")
            return []
            
        # Query Wikidata for books in the source language, published before 1920, 
        # ideally with an author who has a birth/death date.
        query = f"""
        SELECT ?work ?workLabel ?author ?authorLabel ?pubYear WHERE {{
          ?work wdt:P31/wdt:P279* wd:Q571 ;  # instance of book or subclass
                wdt:P407 wd:{wd_lang} ;       # language of work
                wdt:P50 ?author .            # author
          
          OPTIONAL {{ ?work wdt:P577 ?pubDate . BIND(YEAR(?pubDate) AS ?pubYear) }}
          
          # Filter to older works to increase chances of public domain
          FILTER(BOUND(?pubYear) && ?pubYear < 1920)
          
          SERVICE wikibase:label {{ bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en,{source_language_code}". }}
        }} LIMIT {limit}
        """
        
        try:
            res = self.wikidata._query_sparql(query)
            bindings = res.get("results", {}).get("bindings", [])
        except Exception as e:
            logger.error(f"Discovery query failed: {e}")
            return []
            
        candidates = []
        for b in bindings:
            work_title = b.get("workLabel", {}).get("value")
            author_name = b.get("authorLabel", {}).get("value")
            pub_year = b.get("pubYear", {}).get("value")
            work_wd_id = b.get("work", {}).get("value").split("/")[-1]
            
            if not work_title or not author_name:
                continue
                
            # Skip if title looks like a Q-id (no label found)
            if work_title.startswith("Q") and work_title[1:].isdigit():
                continue
                
            try:
                year_int = int(pub_year) if pub_year else None
            except ValueError:
                year_int = None
                
            author = Author(
                name=author_name,
                normalized_name=author_name,
                wikidata_id=b.get("author", {}).get("value").split("/")[-1]
            )
            
            work = Work(
                canonical_title=work_title,
                original_language=source_language_code,
                estimated_first_publication_year=year_int,
                work_type=WorkType.BOOK,
                author=author
            )
            
            candidates.append(work)
            
        logger.info(f"Discovered {len(candidates)} raw candidates. Auditing them...")
        
        # Now run the auditor on each
        for work in candidates:
            audit_record = self.auditor.audit_work(work, target_language_code)
            work.audits = [audit_record]
            
        return candidates
