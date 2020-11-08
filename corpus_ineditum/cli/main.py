import typer
from typing import Optional
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from corpus_ineditum.core.models import Work, Author, WorkType
from corpus_ineditum.audit.auditor import TranslationAuditor
from corpus_ineditum.sources.wikidata import Wikidata
from corpus_ineditum.sources.openlibrary import OpenLibrary

app = typer.Typer(help="CORPUS INEDITUM: A bibliographic archaeology tool.")
console = Console()

@app.command()
def audit(
    title: str = typer.Argument(..., help="Title of the original work"),
    author: Optional[str] = typer.Option(None, help="Author name"),
    target_language: str = typer.Option("es", help="Target language code (e.g. es, en, fr)"),
):
    """Audit a specific work for translations."""
    console.print(f"[bold cyan]CORPUS INEDITUM[/bold cyan]")
    console.print(f"Auditing '{title}' for translations into '{target_language}'\n")
    
    # 1. Try to resolve author
    auth_obj = None
    if author:
        console.print(f"Resolving authority for author: {author}...")
        wd = Wikidata()
        auth_obj = wd.get_author_authority(author)
        if auth_obj:
            console.print(f"[green]Resolved author:[/green] {auth_obj.name} ({auth_obj.birth_year}-{auth_obj.death_year}) [Wikidata: {auth_obj.wikidata_id}]")
        else:
            console.print("[yellow]Could not resolve author authority. Proceeding with raw string.[/yellow]")
            auth_obj = Author(name=author)

    work = Work(
        canonical_title=title,
        work_type=WorkType.BOOK,
        author=auth_obj
    )
    
    # 2. Run Auditor
    auditor = TranslationAuditor()
    with console.status("[bold green]Running multi-source audit...") as status:
        record = auditor.audit_work(work, target_language)
        
    # 3. Print Results
    console.print("\n[bold]Translation audit:[/bold] " + target_language)
    
    color = "red" if "NO_TRANSLATION" in record.status.value else "yellow"
    console.print(f"\nResult:\n[{color} bold]{record.status.value}[/{color} bold]")
    
    console.print(f"\nSearch coverage:\n{record.search_coverage_score:.0f}/100")
    console.print(f"\nPublic-domain assessment:\n{record.public_domain_status.value}")
    
    console.print(f"\nConclusion:\n{record.conclusion_notes}")
    
    # Print Evidence
    console.print("\n[bold]Evidence:[/bold]")
    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("Source")
    table.add_column("Query")
    table.add_column("Result")
    
    for ev in record.evidences:
        table.add_row(ev.source, ev.query_type, ev.result_summary)
        
    console.print(table)


@app.command()
def discover(
    source_language: str = typer.Option(..., help="Original language code (e.g. de, fr)"),
    target_language: str = typer.Option("es", help="Target language code"),
    limit: int = typer.Option(10, help="Number of candidates to evaluate")
):
    """Discover untranslated candidates automatically."""
    from corpus_ineditum.audit.discovery import DiscoveryEngine
    
    console.print("[bold yellow]Discovery mode is experimental.[/bold yellow]")
    console.print(f"Looking for works originally in '{source_language}', untranslated to '{target_language}'.\n")
    
    engine = DiscoveryEngine()
    with console.status(f"[bold green]Discovering up to {limit} candidates via Wikidata and auditing...") as status:
        candidates = engine.discover_candidates(source_language, target_language, limit)
        
    for work in candidates:
        audit = work.audits[0] if work.audits else None
        if not audit:
            continue
            
        color = "red" if "NO_TRANSLATION" in audit.status.value else "yellow"
        
        console.print(f"---")
        console.print(f"[bold]{work.canonical_title}[/bold] by {work.author.name} ({work.estimated_first_publication_year})")
        console.print(f"Status: [{color} bold]{audit.status.value}[/{color} bold]")
        console.print(f"Coverage: {audit.search_coverage_score:.0f}/100 | PD: {audit.public_domain_status.value}")
        console.print(f"Notes: {audit.conclusion_notes}")

    

if __name__ == "__main__":
    app()
