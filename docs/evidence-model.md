# Evidence Model

CORPUS INEDITUM uses an explicit evidence model. It does not hide its conclusions behind a black-box probability score.

Every audit produces a list of `Evidence` records.

## Structure of Evidence

An evidence record contains:

* `query_type`: What strategy was used (e.g., "Author+Title exact match", "Authority ID search").
* `source`: Which catalog was queried (e.g., "Internet Archive", "Open Library").
* `search_parameters`: The exact JSON parameters sent to the source.
* `result_summary`: What the source returned (e.g., "Found 0 matches", "Query failed with 503").
* `found_candidates`: The number of items returned.

## Translation Status

Based on the accumulated evidence, an audit reaches one of the following conclusions:

* `TRANSLATION_CONFIRMED`: Irrefutable proof of translation exists.
* `TRANSLATION_PROBABLE`: Strong candidates exist but need manual verification.
* `TRANSLATION_POSSIBLE`: Vague candidates exist (e.g., matching author and year, but different title).
* `STRONG_NO_TRANSLATION_EVIDENCE`: Multiple robust catalogs were queried successfully, and zero candidates were found.
* `NO_TRANSLATION_FOUND`: Basic queries returned no results, but coverage was low.
* `INSUFFICIENT_EVIDENCE`: The queries failed (e.g., APIs down).
* `UNRESOLVED`: The default state before an audit is complete.

This ensures that an "untranslated" conclusion is always tethered to the specific searches that failed to find it.
