# Evidence Board Workspace

## Summary

The Evidence Board is the alternate review mode. It prioritizes side-by-side comparison, source confidence, strengths, gaps, evidence chips, and recruiter notes so an agency recruiter can defend why candidates made the shortlist.

## Layout

- Desktop uses a compact timeline, comparison grid, and agent/evidence rail.
- Mobile uses stacked comparison cards and notes-first tabs.
- Candidate cards expose fit signals and missing evidence without requiring backend scoring.

## Strengths

- Strongest review and handoff surface.
- Makes the shortlist defensible for internal review or client presentation.
- Pairs naturally with client-side compare and notes state.

## Risks

- Confidence and gaps are heuristic display fields until richer source metadata exists.
- Notes are local-only in v1 and reset on page refresh.

## Implementation Mapping

- Build as selectable alternate mode in `/agent`.
- Reuse the same latest result and candidate state.
- Derive confidence, strengths, and gaps from `headline`, `skillsSummary`, `experienceSummary`, and `linkedinUrl`.
