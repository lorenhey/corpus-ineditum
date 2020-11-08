# Public Domain Assessment

CORPUS INEDITUM provides a basic evaluation of a work's public domain status. 

> [!WARNING]
> The public domain assessments provided by this tool are heuristics intended to aid research. They do NOT constitute legal advice.

## Jurisdictional Complexity

Copyright terms vary significantly by jurisdiction. The core implementation currently assumes a standard "Life + 70 years" rule, which is common in the EU and many other countries. 

If the author's death date is known and occurred more than 70 years ago, the work is flagged as `LIKELY_PUBLIC_DOMAIN`. 
If the author's death date is unknown, but the work was published more than 120 years ago, it is also flagged as `LIKELY_PUBLIC_DOMAIN`.

## Future Improvements

Future iterations could evaluate specific jurisdictions by accepting an argument:
`--jurisdiction US` (which would trigger rules like the 1928 threshold).
