# Methodology

## Epistemology of the Unfound

The core methodological challenge of CORPUS INEDITUM is that "absence of evidence is not evidence of absence." A negative search result in a catalog only indicates that *that specific string* was not found in *that specific index* at *that specific time*.

We address this by producing **audits** rather than boolean answers. 

### The Audit Process

1. **Entity Resolution:** The first step is resolving the author against an authority file (usually Wikidata or VIAF). If we know the author's exact identity, we can avoid false positives caused by name collisions.
2. **Title Normalization:** The original title is recorded, along with known variants.
3. **Target Language Searches:** We query catalogs in the target language. Since we don't know what the translated title would be, we usually search by:
   - Original Title (some translated editions include it in the metadata).
   - Author Name + Target Language constraint.
   - Exact Author Authority ID (if the catalog supports it).
4. **Scoring:** The results are scored based on how many sources were successfully queried and what was found.

## Limitations

* **Intermediate Translations:** A work translated from Latin to French in 1700, and then from French to Spanish in 1850, may not be linked to the Latin original in any catalog.
* **Partial Translations:** Anthologies often contain partial translations that are not cataloged at the work level.
* **Obscure Editions:** Many 19th-century provincial editions were never digitized and exist only in physical card catalogs.
