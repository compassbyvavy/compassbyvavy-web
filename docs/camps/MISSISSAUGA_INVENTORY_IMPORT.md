# Mississauga camps — recovered inventory import (draft only)

## Source recovered
The existing research workbook **Compass_by_Vavy_Mississauga_Camps_AUDITED.xlsx** was located in the user's ChatGPT file Library (not yet committed to this repository). Its **Mississauga Candidates** sheet contains **425** MSC-prefixed candidate rows, checked historically on August 27, 2026.

Actual decisions in that recovered copy (read November 10, 2026): **259 Inspect, 165 Needs Review, 1 Add**. These are review decisions, **not publication approvals**. Do not overwrite decisions with prior recommendations or publish all 425.

## Safe import requirements
1. Import candidate rows as **staging/research candidates** keyed by MSC ID, never directly into published Providers/Programs/Sessions. Preserve all 19 columns, original URLs, source dates, research notes, evidence tiers and review decisions.
2. Maintain a persistent reviewer audit trail. Keep 'Inspect' distinct from 'Add', 'Needs Review', 'Skip', and publication approval. Do not treat 'Add' as auto-publish.
3. Deduplicate provider + stable program/season identity; do not conflate different programs, locations, age bands or session weeks. Keep possible duplicates visible for review.
4. Create provider/program/venue/session records only after evidence review. Session-specific dates, eligibility, registration, care and pricing require session-level official evidence. Unknown is not No.
5. Only published and approved records may appear on the public site or in indexing. Drafts and historical/closed sessions must not appear bookable.
6. The 30 Winter 2026 ActiveNet sessions are already in draft PR #53; cross-reference rather than create duplicate camp families.
7. Build a reviewer queue ordered by evidence tier and priority, with Add / Reject / Needs Follow-up and audit history. Record source URL and verified-at per fact.
8. Do not schedule scraping or availability polling for all 425. Check providers individually for permission, access and public availability signals.

## Source limitation
The source workbook is in the user's ChatGPT Library, not in the repository. The candidate data must be transferred and imported explicitly before any claim that all 425 are on the website. No automatic publication, database migration, or deployment is authorized.
