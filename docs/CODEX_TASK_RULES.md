# Codex Task Rules — Sports Admin

## Goal
Define tasks that improve data quality, reliability, or structure without ambiguity.

## Format

### Task
Clear, single-purpose description.

### Context
How this affects data integrity, ingestion reliability, or consumers.

### Requirements
- concrete transformations or validations
- schema changes spelled out explicitly
- acceptance criteria measurable in data terms

### Done When
- documented behavior matches implementation
- pipelines run without silent errors
- downstream consumers remain compatible (or migration path exists)

### Notes (optional)
- assumptions about data sources
- edge cases to consider
- which services/files will likely be touched

## Guidance
- Prefer incremental improvements.
- Avoid massive schema overhauls without clear value.
- Consider how failures should surface (logs, alerts, retries).

Think like a data engineer, not a UI dev:
**correct beats clever**.