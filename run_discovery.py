from corpus_ineditum.audit.discovery import DiscoveryEngine
import json

if __name__ == "__main__":
    engine = DiscoveryEngine()
    print("Discovering...")
    # Get 50 candidates from German to Spanish
    candidates = engine.discover_candidates("de", "es", limit=50)
    
    with open("initial_corpus.jsonl", "w", encoding="utf-8") as f:
        for work in candidates:
            audit = work.audits[0] if work.audits else None
            
            record = {
                "title": work.canonical_title,
                "author": work.author.name if work.author else None,
                "original_language": work.original_language,
                "estimated_year": work.estimated_first_publication_year,
                "status": audit.status.value if audit else None,
                "coverage_score": audit.search_coverage_score if audit else None,
                "pd_status": audit.public_domain_status.value if audit else None,
                "conclusion": audit.conclusion_notes if audit else None,
                "evidences": [
                    {
                        "source": ev.source,
                        "query": ev.query_type,
                        "result": ev.result_summary
                    } for ev in (audit.evidences if audit else [])
                ]
            }
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
            
    print("Done. Wrote to initial_corpus.jsonl")
