# Translation Audit Example

To understand how CORPUS INEDITUM works, it is helpful to walk through a complete, narrated audit.

## The Candidate
**Title:** *Die Johannis-Freimaurerloge zum schwarzen Bär im Orient von Hannover 1774 bis 1874*  
**Author:** Wilhelm Nöldeke  
**Year:** 1875  
**Original Language:** German (`de`)  
**Target Language:** Spanish (`es`)

### 1. Original Bibliographic Record
The system discovers this work through Wikidata (Q-ID mapping to a book entity). The title translates roughly to "The Masonic Lodge of St. John of the Black Bear in the Orient of Hanover 1774 to 1874". It is a highly specific, local history text—exactly the kind of obscure work that might have escaped translation.

### 2. Authority Resolution
Before searching, the system attempts to resolve the author. 
* Wikidata confirms "Wilhelm Nöldeke", a 19th-century author. 

### 3. Target-Language Searches
We query our configured sources for a Spanish translation.

**Strategy A: Exact Title & Author Search (Internet Archive)**
We query the Internet Archive for texts with creator "Wilhelm Nöldeke" and title matching the original (in case the original title is preserved in metadata) or translated variants.
* Result: `0 editions found`

**Strategy B: Author Search (Open Library)**
We query Open Library for any works by "Wilhelm Nöldeke", looking for Spanish editions.
* Result: `0 editions found`

### 4. Rights Assessment
* Publication Date: 1875.
* Author Death: (If unknown, we fall back to publication date). 2026 - 1875 = 151 years.
* Conclusion: `LIKELY_PUBLIC_DOMAIN`.

### 5. Conclusion Formulation
The auditor compiles the evidence.

* **Status:** `STRONG_NO_TRANSLATION_EVIDENCE`
* **Search Coverage:** 100/100 (based on configured sources: IA, OL).
* **Notes:** "No es translation was identified in the consulted catalogues. This is strong negative evidence but not proof that no translation has ever existed."

### The Human Verdict
An editor reviewing this fiche can conclude: this is an incredibly obscure piece of Masonic history. It is highly probable that it was never translated into Spanish, as the demand for Hanoverian lodge history in the Spanish-speaking world during the late 19th and 20th centuries was presumably minimal. If an editor wishes to publish it, they can proceed with high confidence that they are producing a first edition in that language.
