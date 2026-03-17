---
name: cli-performance
description: Use the CLI app for reproducible scale diagnostics, seed validation, benchmark execution, and performance investigation for Supabase and frontend-facing query paths.
disable-model-invocation: true
argument-hint: [target]
---

# CLI Performance

Use this skill when working on `apps/cli` commands related to seeding, scale testing, benchmark orchestration, or performance diagnostics.

Target: $ARGUMENTS

## Goals

- validate seed scale assumptions
- benchmark known heavy query paths
- produce reproducible diagnostics
- inspect whether frontend breakage is caused by query size, payload size, or rendering cost

## Required outputs

- benchmark target
- dataset assumptions
- measured query path
- observed bottleneck
- proposed fix