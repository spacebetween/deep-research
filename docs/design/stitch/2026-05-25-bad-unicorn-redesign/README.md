# Bad Unicorn Candidate Sourcing Redesign

Date: 2026-05-25

## Stitch Project

- Project: `Bad Unicorn Candidate Sourcing Redesign`
- Project ID: `9168910471214814471`
- Design system: `High-Signal Sourcing Lab`
- Design system asset ID: `b80a2949720b47d18046e19062532687`

## Generated Directions

| Direction | Desktop screen ID | Mobile screen ID | Build status |
| --- | --- | --- | --- |
| Calibration Loop Console | `89fc6857427c47a3b0585e5bd0807a25` | `c37d779b9160451c9d107f66e764e554` | Build as default mode |
| Evidence Board Workspace | `aba0fdb4f86147ebb42d4623e3e722a9` | `09d1abdc02c34a87a2d4b6efca5c1ebc` | Build as alternate mode |
| Search Strategy Cockpit | `10df3764e8e24d54a38687b433feb1cc` | `dd28ae8657dc4e66b56b9900a5c13f4a` | Keep as reference direction |

## Selected Build Directions

The top two directions are Calibration Loop Console and Evidence Board Workspace.

Calibration Loop is the product wedge: the recruiter starts with a rough natural-language brief, the agent asks for missing context, and the UI shows how the brief improves into a defensible shortlist.

Evidence Board is the review mode: it helps the recruiter defend, compare, and annotate candidates using derived fit signals, source confidence, and gaps from the existing API response.

Search Strategy Cockpit is valuable for future power-user work, but it needs richer backend search telemetry before it can be more than a static UI.

## Design System Notes

Stitch named the shared system `High-Signal Sourcing Lab`. The useful implementation guidance is:

- Dense recruiter workspace over chatbot novelty.
- Neutral surfaces, restrained borders, and compact scan-friendly typography.
- One unicorn purple accent for brand and primary states.
- Signal green only for progress, quality, and confident matches.
- No marketing hero, mascot-heavy layout, decorative gradients, or dashboard-card mosaic.

## Implementation Mapping

- `/agent` becomes the primary redesigned workspace.
- `/`, `/recruiter`, and `/recruiters` redirect to `/agent`.
- The existing `/api/agent` envelope remains unchanged.
- Candidate save, reject, compare, selected-candidate, and notes state remain client-side only.
- Non-streaming agent requests use optimistic progress labels while the request is in flight.
