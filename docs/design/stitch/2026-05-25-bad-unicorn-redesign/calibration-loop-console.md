# Calibration Loop Console

## Summary

The Calibration Loop Console is the default product direction. It treats natural-language chat as the central control surface while surrounding it with recruiter-grade state: brief quality, missing-context prompts, criteria chips, generated queries, and a shortlist that can be saved, rejected, or compared.

## Layout

- Three-pane desktop workspace: context and conversation, calibration loop, shortlist.
- Mobile stacks quality, missing context, composer, criteria, and candidates.
- Progress is optimistic because `/api/agent` remains non-streaming.

## Strengths

- Best match for the product wedge.
- Makes the agent feel like a sourcing partner rather than a generic chatbot.
- Gives the recruiter visible evidence that each clarification changes the search.

## Risks

- Brief quality is derived from available fields, not a backend score.
- Optimistic progress labels are perception aids, not true server events.

## Implementation Mapping

- Build as default mode in `/agent`.
- Use existing `responseType`, `clarification`, `criteria`, `queries`, and `candidates`.
- Add client-only candidate status and comparison state.
