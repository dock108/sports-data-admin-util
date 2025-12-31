# Sports Admin — Project Intent

## Why this exists
Sports Admin is the backbone behind our sports apps.

It:
- ingests data from external feeds
- normalizes formats
- validates consistency
- prepares structured datasets for consumer apps

If this repo breaks, everything downstream feels wrong.

## Principles
- Data correctness first
- Consistent schemas
- Traceable processing steps
- Minimal surprises for downstream consumers

## Scope
Focus initially on:
- reliable ingestion
- clean normalized storage
- easy-to-query outputs
- simple tools admins actually use

Expand only when it clearly improves workflow or stability.

## Expectations for AI + Devs
- do not guess meanings in data
- prefer explicit validation rules
- comment tricky transformations
- never introduce breaking changes silently

Everything ties back to:
“Can consumers rely on this data without second-guessing it?”