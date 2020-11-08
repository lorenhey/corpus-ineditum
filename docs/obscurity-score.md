# Obscurity Score

Not all untranslated books are equally interesting. Some are extremely well-known works that happen to have missed a particular language, while others have been entirely forgotten by history. 

CORPUS INEDITUM implements an `obscurity_score` (0-100) and an `ObscurityLabel` to help rank candidates.

## Heuristics

The score is deliberately experimental. It takes into account:

1. **Number of known editions:** If Open Library knows about 50 editions, the work is not obscure.
2. **Library holdings:** (To be implemented) Presence in major catalogs like WorldCat.
3. **Number of digitalizations:** If a book has been scanned 20 times on Internet Archive, it is of interest to someone.
4. **Wikipedia Sitelinks:** Works without Wikipedia pages are generally more obscure.

## Interpretation

* `EXTREMELY_OBSCURE`: Very few editions, no Wikipedia page, zero or one digitalizations.
* `OBSCURE`: A few surviving editions, perhaps known in its niche.
* `WELL_KNOWN`: Many editions, widely available in its original language.
