# Search Strategy Cockpit

## Summary

The Search Strategy Cockpit is a power-user reference direction for steering query strategy. It exposes editable criteria, query variants, exclusions, source coverage, pool estimate, and preview candidates.

## Layout

- Agent reasoning rail.
- Strategy editor with generated queries and constraints.
- Signal rail with pool estimate and shortlist preview.

## Strengths

- Good future direction for sourcers who want more control over search strategy.
- Makes generated queries and constraints inspectable.
- Could become the advanced mode once backend telemetry is richer.

## Risks

- Current API does not provide pool estimates, query performance, source coverage, or structured exclusions.
- Building it fully now would require invented data or backend expansion.

## Implementation Mapping

- Do not build as a top variation in v1.
- Borrow compact query/criteria timeline ideas for Calibration Loop and Evidence Board.
- Revisit when `/api/agent` exposes search telemetry or a persisted role workspace.
