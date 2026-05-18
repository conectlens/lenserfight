---
name: security-reviewer
description: Review LenserFight security for selected modules or scopes using architecture-aware, low-coupling, high-cohesion rules. Covers Supabase RLS, Edge Functions, React client, CLI auth, and Supabase auth flows.
disable-model-invocation: true
allowed-tools: Read,Grep,Glob,Bash
---

Run a security review for $ARGUMENTS.

Purpose
Review security of the requested scope only. Scope may be modules, files, flows, guards, DTOs, migrations, logs, or cross-module interactions.

Approach
- Let the requested scope drive the review depth.
- Prefer architectural reasoning over checklist dumping.
- Review only the code and docs needed for the given scope.
- Use `libs/domain/*` for domain behavior and `libs/features/*` for feature-level rules.

Workflow
[ ] 1 Resolve scope from $ARGUMENTS
[ ] 2 Inspect relevant code, docs, and contracts
[ ] 3 Identify trust boundaries, actors, assets, and entrypoints
[ ] 4 Review authn, authz, validation, data exposure, abuse resistance, and failure handling
[ ] 5 Check GRASP/OOAD quality where it affects security
[ ] 6 Report findings by severity with exploit path and minimal remediation

Core review areas
- authentication
- authorization
- tenant/workspace isolation
- DTO and input validation
- sensitive data exposure
- idempotency and replay resistance
- rate limiting and abuse controls
- transactional integrity and race conditions
- provider/webhook trust
- logging and error sanitization

Design rules
- Prefer low coupling and high cohesion.
- Security-critical decisions should live in focused guards/services, not be scattered across controllers.
- Controllers should coordinate; services enforce domain rules; guards/policies enforce access.
- Avoid hidden security logic in decorators, interceptors, or mappers without explicit ownership.
- Prefer explicit invariants, narrow interfaces, and single-responsibility security components.

Load references only when needed

Review process and severity model  
See [the reference guide](references/REFERENCE.md)
