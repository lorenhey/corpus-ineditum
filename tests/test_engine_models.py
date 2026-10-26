import pytest
from datetime import datetime
from corpus_ineditum.core.models import Work, Author, WorkType, AuditRecord, Evidence
from corpus_ineditum.core.enums import TranslationStatus, PublicDomainStatus
from corpus_ineditum.audit.auditor import TranslationAuditor

def test_models_and_enums():
    author = Author(name="Leonhard Euler", death_year=1783)
    work = Work(
        canonical_title="Elements of Algebra",
        original_language="de",
        estimated_first_publication_year=1765,
        work_type=WorkType.BOOK,
        author=author
    )
    assert work.canonical_title == "Elements of Algebra"
    assert work.author.death_year == 1783
    assert work.original_language == "de"

def test_offline_public_domain_assessment():
    auditor = TranslationAuditor()
    
    # Author died > 70 years ago
    work_euler = Work(
        canonical_title="Elements of Algebra",
        author=Author(name="Leonhard Euler", death_year=1783)
    )
    status_euler = auditor._assess_public_domain(work_euler)
    assert status_euler == PublicDomainStatus.LIKELY_PUBLIC_DOMAIN

    # Published > 120 years ago without author death year
    work_old = Work(
        canonical_title="Old Anonymous Codex",
        estimated_first_publication_year=1800
    )
    status_old = auditor._assess_public_domain(work_old)
    assert status_old == PublicDomainStatus.LIKELY_PUBLIC_DOMAIN

    # Author died recently (< 70 years)
    current_year = datetime.now().year
    work_recent = Work(
        canonical_title="Recent Work",
        author=Author(name="Recent Author", death_year=current_year - 20)
    )
    status_recent = auditor._assess_public_domain(work_recent)
    assert status_recent == PublicDomainStatus.NOT_PUBLIC_DOMAIN

def test_audit_record_evidence_compilation():
    work = Work(canonical_title="Test Work", original_language="de")
    audit = AuditRecord(target_language="es", work=work)
    
    ev1 = Evidence(
        query_type="Author+Title",
        source="Open Library",
        search_parameters={"title": "Test Work"},
        result_summary="Found 0 matches. Total 10 editions found.",
        found_candidates=0
    )
    ev2 = Evidence(
        query_type="Author+Title",
        source="Internet Archive",
        search_parameters={"title": "Test Work"},
        result_summary="Found 0 matches. Total 4 editions found.",
        found_candidates=0
    )
    audit.evidences = [ev1, ev2]
    audit.status = TranslationStatus.STRONG_NO_TRANSLATION_EVIDENCE
    audit.search_coverage_score = 100.0
    
    assert len(audit.evidences) == 2
    assert audit.status == TranslationStatus.STRONG_NO_TRANSLATION_EVIDENCE
    assert audit.search_coverage_score == 100.0
