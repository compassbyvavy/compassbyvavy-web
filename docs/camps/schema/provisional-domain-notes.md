# Camp domain — provisional schema notes (Prompt 3)

Derived from approved Prompt 1–2 modelling. Reconcile against the Camp Research Master workbook when an export is provided under `docs/camps/schema/`.

## Distinct entities

| Entity | Purpose |
|--------|---------|
| Provider | Organization offering programs |
| CampProgram | Stable program identity (slug, ages, themes) |
| CampSession | Dated offering with registration lifecycle + capacity |
| Venue | Physical/online place — referenced by session, not program |

## Registration vs capacity

- `CampSession.registrationStatus` — lifecycle (includes `registration_closed`)
- `CampSession.seatAvailability` — capacity only (`unknown` \| `confirmed_available` \| `confirmed_full`)
- Display actions come only from `getRegistrationAction`

## Matching-session rule (cards)

Price, dates, hours, and venue summaries on CampCard are derived from the **matching session array** passed into the card — never from unmatched sessions or a single program-level venue field.

Empty matching sessions → **dates unverified** context (not “No upcoming sessions”).
