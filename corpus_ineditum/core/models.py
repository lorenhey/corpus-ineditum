from typing import List, Optional, Dict, Any
from datetime import datetime, date
from sqlmodel import SQLModel, Field, Relationship, JSON, Column
from pydantic import BaseModel
from .enums import (
    TranslationStatus,
    LanguageConfidence,
    TranslationDirectness,
    TranslationCompleteness,
    PublicDomainStatus,
    DigitizationQuality,
    ObscurityLabel,
    WorkType
)


class AuthorBase(SQLModel):
    name: str
    normalized_name: Optional[str] = None
    birth_year: Optional[int] = None
    death_year: Optional[int] = None
    viaf_id: Optional[str] = None
    isni_id: Optional[str] = None
    wikidata_id: Optional[str] = None


class Author(AuthorBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    works: List["Work"] = Relationship(back_populates="author")


class WorkBase(SQLModel):
    canonical_title: str
    original_title: Optional[str] = None
    original_language: Optional[str] = None
    language_confidence: LanguageConfidence = LanguageConfidence.UNKNOWN
    estimated_first_publication_year: Optional[int] = None
    work_type: WorkType = WorkType.UNKNOWN
    subjects: List[str] = Field(default=[], sa_column=Column(JSON))
    notes: Optional[str] = None
    
    author_id: Optional[int] = Field(default=None, foreign_key="author.id")


class Work(WorkBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    author: Optional[Author] = Relationship(back_populates="works")
    editions: List["Edition"] = Relationship(back_populates="work")
    translations: List["Translation"] = Relationship(back_populates="original_work")
    audits: List["AuditRecord"] = Relationship(back_populates="work")


class EditionBase(SQLModel):
    edition_title: str
    publication_place: Optional[str] = None
    publisher: Optional[str] = None
    publication_year: Optional[int] = None
    language: Optional[str] = None
    edition_statement: Optional[str] = None
    pagination: Optional[str] = None
    identifiers: Dict[str, str] = Field(default={}, sa_column=Column(JSON))
    
    work_id: Optional[int] = Field(default=None, foreign_key="work.id")
    translation_id: Optional[int] = Field(default=None, foreign_key="translation.id")


class Edition(EditionBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    work: Optional[Work] = Relationship(back_populates="editions")
    translation: Optional["Translation"] = Relationship(back_populates="editions")
    digitalizations: List["Digitalization"] = Relationship(back_populates="edition")


class TranslationBase(SQLModel):
    target_language: str
    translator: Optional[str] = None
    directness: TranslationDirectness = TranslationDirectness.UNKNOWN
    intermediate_language: Optional[str] = None
    completeness: TranslationCompleteness = TranslationCompleteness.UNKNOWN
    confidence: float = 0.0
    evidence_notes: Optional[str] = None
    
    original_work_id: Optional[int] = Field(default=None, foreign_key="work.id")


class Translation(TranslationBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    original_work: Optional[Work] = Relationship(back_populates="translations")
    editions: List[Edition] = Relationship(back_populates="translation")


class DigitalizationBase(SQLModel):
    institution: str
    source_url: Optional[str] = None
    persistent_identifier: Optional[str] = None
    quality: DigitizationQuality = DigitizationQuality.UNKNOWN
    ocr_available: bool = False
    file_formats: List[str] = Field(default=[], sa_column=Column(JSON))
    access_status: Optional[str] = None
    license_or_rights: Optional[str] = None
    
    edition_id: Optional[int] = Field(default=None, foreign_key="edition.id")


class Digitalization(DigitalizationBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    edition: Optional[Edition] = Relationship(back_populates="digitalizations")


class EvidenceBase(SQLModel):
    query_type: str
    source: str
    search_parameters: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    result_summary: str
    found_candidates: int = 0
    raw_response_ref: Optional[str] = None  # Reference to a file or cache key if needed
    retrieved_at: datetime = Field(default_factory=datetime.utcnow)
    
    audit_id: Optional[int] = Field(default=None, foreign_key="auditrecord.id")


class Evidence(EvidenceBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    audit: Optional["AuditRecord"] = Relationship(back_populates="evidences")


class AuditRecordBase(SQLModel):
    target_language: str
    audit_date: datetime = Field(default_factory=datetime.utcnow)
    status: TranslationStatus = TranslationStatus.UNRESOLVED
    search_coverage_score: float = 0.0
    metadata_quality_score: float = 0.0
    obscurity_score: float = 0.0
    obscurity_label: ObscurityLabel = ObscurityLabel.MODERATELY_KNOWN
    public_domain_status: PublicDomainStatus = PublicDomainStatus.UNCERTAIN
    conclusion_notes: Optional[str] = None
    
    work_id: Optional[int] = Field(default=None, foreign_key="work.id")


class AuditRecord(AuditRecordBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    work: Optional[Work] = Relationship(back_populates="audits")
    evidences: List[Evidence] = Relationship(back_populates="audit")
