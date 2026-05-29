---
title: GitHub PR Review
description: Fetches and summarises a GitHub pull request for review.
---

# GitHub PR Review

## Overview

The `github_pr_review` node fetches a GitHub pull request by repository and PR number, then produces a structured summary including metadata, diff statistics, review comments, and a generated review narrative. It requires a GitHub personal access token or OAuth credential with `repo` (or `public_repo`) scope. If the PR cannot be fetched — due to invalid credentials, a non-existent PR, or rate limiting — execution routes to the `error` output port with a typed error payload.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `repository` | string | Yes | Full repository path in `owner/repo` format (e.g. `octocat/hello-world`). Must match the repository that hosts the target pull request. |
| `pr_number` | number | Yes | Pull request number to fetch. Must be a positive integer referencing an existing PR in the specified repository. |
| `credential_id` | string | Yes | ID of a stored GitHub credential (personal access token or OAuth token) with at least `repo` or `public_repo` scope. |
| `include_diff` | boolean | No | When true, the full unified diff is fetched and included in the output payload. Defaults to false. Large diffs may impact downstream token usage. |
| `summary_model` | enum | No | AI model used to generate the review narrative. Accepted values: `gpt-4o`, `claude-sonnet`, `gemini-pro`. Defaults to the workspace default model if unset. |
| `max_diff_bytes` | number | No | Upper bound on the diff payload size in bytes before it is truncated. Defaults to 32768. Applies only when `include_diff` is true. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any | Trigger signal that starts the node. Any upstream value is accepted; the node uses its own config to determine what to fetch. |
| `pr_override` | object | Optional dynamic override for `repository` and/or `pr_number` at runtime. Fields present in this object take precedence over the static config values. Shape: `{ repository?: string; pr_number?: number }`. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Structured PR review payload on success. Shape: `{ pr: PullRequestMeta; diff_stats: DiffStats; comments: ReviewComment[]; summary: string }` where `summary` is the AI-generated review narrative. |
| `error` | object | Emitted when the node fails to fetch or process the PR. Shape: `{ code: string; message: string; retryable: boolean }`. Common codes: `AUTH_FAILED`, `NOT_FOUND`, `RATE_LIMITED`. |

## Example

```json
{
  "nodeType": "github_pr_review",
  "config": {
    "repository": "acme-org/backend-api",
    "pr_number": 412,
    "credential_id": "cred_gh_prod_readonly",
    "include_diff": true,
    "max_diff_bytes": 65536
  }
}
```
