# ADR 0001: Record Architecture Decisions & Adopt Spec-First / DDD Foundation

- **Status:** Accepted
- **Date:** 2026-07-24
- **Deciders:** wasim

## Context
MetaBridge AI is a large, multi-module SaaS intended to grow across three phases and multiple
integrations. Multiple contributors — including AI assistants (Cursor, Windsurf, Claude,
Devin) — will work on it. Without a single enforced standard, code style, architecture, and
process will drift and modules will become tightly coupled, making future expansion costly.

## Decision
1. **Single source of truth:** `AGENTS.md` defines the engineering standard. Tool-specific
   rule files (`.cursorrules`, `.cursor/rules/*.mdc`, `.windsurfrules`, `CLAUDE.md`) point back
   to it.
2. **Spec-first:** no code without a spec in `docs/specs/`.
3. **Changelog-first:** every session begins by reading `CHANGELOG.md`; it always states Done /
   In Progress / Next; it is updated as the last step of any work.
4. **Task-driven:** work tracked in `docs/tasks/`.
5. **Architecture:** DDD (4 layers) + Repository Pattern + Event-Driven Architecture, with
   strict module boundaries (loose coupling) and provider interfaces for extensibility.
6. **ADRs:** significant technical decisions (incl. tech-stack changes) are recorded here.

## Consequences
- Consistent, low-coupling codebase that scales across phases and contributors.
- Slightly more up-front process (spec + task + changelog) per change — accepted as worthwhile.
- Boundary rules must be enforced in CI (lint import rules + dependency-cruiser).

## Alternatives Considered
- **Ad-hoc / code-first:** faster initially, but leads to coupling and drift — rejected.
- **Single monolithic layer (no DDD):** simpler, but the module count and future roadmap make
  clean boundaries essential — rejected.
