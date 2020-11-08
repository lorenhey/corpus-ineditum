import pytest
from corpus_ineditum.core.models import Work, Author, WorkType
from corpus_ineditum.audit.auditor import TranslationAuditor
from corpus_ineditum.core.enums import TranslationStatus

def test_translation_auditor_instantiation():
    auditor = TranslationAuditor()
    assert len(auditor.sources) >= 1

def test_audit_work_insufficient_evidence():
    # A dummy test to ensure the auditor runs
    work = Work(
        canonical_title="Dummy Unfindable Book 123456",
        work_type=WorkType.BOOK,
        author=Author(name="Test Author")
    )
    
    auditor = TranslationAuditor()
    # It might actually query the real APIs here. 
    # For a real CI, we'd mock the HTTPX client using respx or similar.
    # We just want to see it doesn't crash.
    record = auditor.audit_work(work, "es")
    
    assert record.target_language == "es"
    # Should probably be strong no translation evidence or insufficient evidence
    assert record.status in [
        TranslationStatus.STRONG_NO_TRANSLATION_EVIDENCE, 
        TranslationStatus.INSUFFICIENT_EVIDENCE
    ]
