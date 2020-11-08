from fastapi import FastAPI, Request, Form
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(title="CORPUS INEDITUM")

# Get absolute path for templates
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

# Optional static files if we need css
# app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/search", response_class=HTMLResponse)
async def search(request: Request, query: str = Form(...)):
    # Placeholder for actual search logic
    from corpus_ineditum.core.models import Work, Author, WorkType
    from corpus_ineditum.audit.auditor import TranslationAuditor
    
    work = Work(
        canonical_title=query,
        work_type=WorkType.BOOK,
        author=Author(name="Unknown")
    )
    
    auditor = TranslationAuditor()
    record = auditor.audit_work(work, "es")
    
    return templates.TemplateResponse("results.html", {
        "request": request, 
        "query": query,
        "record": record,
        "work": work
    })
