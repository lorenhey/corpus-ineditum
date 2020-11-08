from typing import List, Dict, Optional, Tuple
from datetime import datetime
import logging
from corpus_ineditum.core.models import (
    Work, AuditRecord, Evidence, TranslationStatus, 
    ObscurityLabel, PublicDomainStatus, Edition
)
from corpus_ineditum.sources.openlibrary import OpenLibrary
from corpus_ineditum.sources.wikidata import Wikidata
from corpus_ineditum.sources.internet_archive import InternetArchive

logger = logging.getLogger(__name__)

class TranslationAuditor:
    def __init__(self):
        self.sources = [
            OpenLibrary(),
            InternetArchive(),
            # Add other sources here (HathiTrust, Gallica, BNE etc. later)
        ]
        
    def audit_work(self, work: Work, target_language: str) -> AuditRecord:
        """
        Executes a translation audit for a given work and target language.
        """
        logger.info(f"Starting audit for '{work.canonical_title}' -> {target_language}")
        
        audit = AuditRecord(
            target_language=target_language,
            work=work
        )
        
        evidences = []
        found_editions = []
        
        # Strategy A: Exact title match in target language catalogues
        # Since we might not know the translated title, we search by original title and author
        for source in self.sources:
            logger.info(f"Querying {source.name} for editions...")
            try:
                # We search by author if we have one, otherwise just title
                author_name = work.author.name if work.author else None
                editions = source.search_editions(
                    title=work.canonical_title, 
                    author=author_name,
                    language=target_language
                )
                
                # Also check without language constraint to see if original exists
                all_editions = source.search_editions(
                    title=work.canonical_title,
                    author=author_name
                )
                
                found_editions.extend(editions)
                
                evidence = Evidence(
                    query_type="Author+Title",
                    source=source.name,
                    search_parameters={"title": work.canonical_title, "author": author_name, "lang": target_language},
                    result_summary=f"Found {len(editions)} potential target language matches. Total {len(all_editions)} editions found.",
                    found_candidates=len(editions)
                )
                evidences.append(evidence)
                
            except Exception as e:
                logger.error(f"Error querying {source.name}: {e}")
                evidences.append(Evidence(
                    query_type="Author+Title",
                    source=source.name,
                    search_parameters={"title": work.canonical_title},
                    result_summary=f"Query failed: {str(e)}"
                ))

        audit.evidences = evidences
        
        # Evaluate findings
        if found_editions:
            audit.status = TranslationStatus.TRANSLATION_POSSIBLE
            audit.conclusion_notes = f"Found {len(found_editions)} potential matches in {target_language}. Manual review required to confirm if they are translations or false positives."
        else:
            # Check how many sources we successfully queried
            success_count = sum(1 for e in evidences if "failed" not in e.result_summary)
            if success_count >= 1:
                audit.status = TranslationStatus.STRONG_NO_TRANSLATION_EVIDENCE
                audit.search_coverage_score = (success_count / len(self.sources)) * 100
                audit.conclusion_notes = f"No {target_language} translation was identified in the consulted catalogues. This is strong negative evidence but not proof that no translation has ever existed."
            else:
                audit.status = TranslationStatus.INSUFFICIENT_EVIDENCE
                audit.conclusion_notes = "Queries to major sources failed or were inconclusive."
                
        # Public Domain assessment (Basic heuristic)
        audit.public_domain_status = self._assess_public_domain(work)
        
        return audit
        
    def _assess_public_domain(self, work: Work) -> PublicDomainStatus:
        """Basic heuristic for PD: author died > 70 years ago, or published > 100 years ago."""
        current_year = datetime.now().year
        
        if work.author and work.author.death_year:
            if current_year - work.author.death_year > 70:
                return PublicDomainStatus.LIKELY_PUBLIC_DOMAIN
            else:
                return PublicDomainStatus.NOT_PUBLIC_DOMAIN
                
        if work.estimated_first_publication_year:
            if current_year - work.estimated_first_publication_year > 120:
                return PublicDomainStatus.LIKELY_PUBLIC_DOMAIN
                
        return PublicDomainStatus.UNCERTAIN
