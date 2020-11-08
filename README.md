# CORPUS INEDITUM

> Finding a translation is a bibliographic problem. Failing to find one is an epistemological problem.

CORPUS INEDITUM is a reproducible bibliographic research instrument designed to locate, investigate, classify, and audit historical works that may never have crossed a language barrier.

It exists to answer a question that libraries are structurally unequipped to handle: *What old books still exist exclusively in the language in which they were written?*

Libraries are very good at telling us what they contain. They are considerably worse at telling us what has never existed.

## The Problem with "Never Translated"

Proving that a translation exists is easy enough: you find the book, you point to it. Proving that a translation does *not* exist is where the trouble begins. 

"Absence of evidence is not evidence of absence." A negative search result in a catalog only means that specific catalog, queried with a specific string, on a specific day, did not return a match. The translation might exist under a completely different title, as part of an anthology, or in an obscure provincial edition that was never digitized.

Therefore, CORPUS INEDITUM does not traffic in absolute negative certainties. It produces **audits**. 

When it cannot find a translation, it tells you exactly where it looked, what it searched for, and what it found instead, yielding a conclusion like `STRONG_NO_TRANSLATION_EVIDENCE`.

## Methodology & Features

CORPUS INEDITUM operates under a canonical bibliographic model (Work → Expression → Edition → Digitalization).

* **Entity Resolution:** Authors are normalized against authority files (Wikidata, VIAF) to prevent "Johann Müller" and "Johannes Müller" from splitting the bibliography.
* **Title Variants:** Searches are conducted using exact titles, normalized titles, and fuzzy matching to catch retitled translations.
* **Positive & Negative Evidence:** Every audit records exactly what was searched and what the result was. 
* **Public Domain Assessment:** Basic heuristics to estimate if a work and its translation rights have entered the public domain.
* **Discovery Mode:** Automatically harvests candidates from Wikidata (e.g., "German books published before 1900 with no known sitelinks to Spanish Wikipedia").

## Installation

Requires Python 3.10+.

```bash
git clone https://github.com/lorenhey/corpus-ineditum.git
cd corpus-ineditum
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Unix:
source venv/bin/activate

pip install -e .
```

## Usage

### Auditing a Known Work

If you have a specific work in mind and want to audit its translation history into a target language (default is Spanish `es`):

```bash
corpus-ineditum audit "De rerum natura" --author "Lucretius" --target-language es
```

### Discovery Mode

To discover obscure, untranslated works automatically:

```bash
corpus-ineditum discover --source-language de --target-language es --limit 5
```

This will query Wikidata for works originally in German, resolve the authors, and run a translation audit against Open Library and the Internet Archive.

## Limitations

* **Catalog incompleteness:** We rely on APIs from Open Library, Internet Archive, Wikidata, etc. If a book isn't cataloged there, we can't find it.
* **Intermediate translations:** A German book translated to French, and then from French to Spanish, often breaks metadata chains.
* **Partial translations:** We currently struggle to detect if only three chapters of a book were translated in an obscure 19th-century journal.
* **API Rate Limits:** Running massive batch discoveries will eventually hit rate limits. The tool implements backoff and caching to mitigate this.

## Why build this?

A book can disappear without being lost. Sometimes all that is required is that nobody bother to translate it. This tool is built to find those books, pull their metadata, check if they are in the public domain, and present them for human review. It is an engine for editorial scouting and bibliographic archaeology.

## License

MIT License. See `LICENSE` for details.
