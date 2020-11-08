# Limitations

This is an instrument of bibliographic archaeology, not magic.

## 1. Catalog Dependencies
The tool's vision is strictly limited to the vision of its sources (Open Library, Internet Archive, Wikidata, etc.). If a book exists but was never cataloged online, the tool cannot find it. 

## 2. API Rate Limits
Aggressive discovery will trigger HTTP 429 (Too Many Requests) from catalog APIs. We use caching and backoff to mitigate this, but batch operations should be run patiently.

## 3. False Positives in Entity Resolution
If a catalog groups "Juan Smith" and "John Smith" into the same entity, the tool might incorrectly assume a translation exists. We rely on the quality of authority files like VIAF and Wikidata.

## 4. Retitled Translations
A Spanish translation of a German book might bear no resemblance to the original title. While we attempt fuzzy matching and author-based lookups, a wildly different title might slip through the cracks.

## 5. What does "never translated" mean?
See our note in the README. A book might have been partially translated in a journal, or translated privately in a manuscript. "No translation found" strictly means "No translation was identified in the major public catalogs."
