---
title: GitHub Issue Create
description: Creates a GitHub issue in a repository.
---

# GitHub Issue Create

## Overview

The GitHub Issue Create node creates a new issue in a specified GitHub repository using the GitHub API. It requires a GitHub personal access token or OAuth credential with `repo` scope. On success it emits the created issue's metadata (number, URL, ID) on the `output` port; on failure it routes to the `error` port with the API error details. Use this node to programmatically file issues from battle results, workflow failures, or AI-generated findings.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `credential` | string | Yes | ID of the stored GitHub credential (personal access token or OAuth app token) with `repo` scope. |
| `owner` | string | Yes | GitHub repository owner — a user login or organization name (e.g. `acme-org`). |
| `repo` | string | Yes | Repository name without the owner prefix (e.g. `backend-api`). |
| `title` | string | Yes | Issue title. Supports template variables (e.g. `{{input.title}}`). |
| `body` | string | No | Issue body in Markdown. Supports template variables. |
| `labels` | string | No | Comma-separated list of label names to apply (e.g. `bug,automated`). Labels that do not exist in the repository are silently ignored by the GitHub API. |
| `assignees` | string | No | Comma-separated list of GitHub usernames to assign the issue to. |
| `milestone` | number | No | Milestone number to associate with the issue. Must already exist in the repository. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | Trigger signal and optional data to interpolate into the issue title, body, or other fields via template variables. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Emitted on success. Contains the created issue object: `{ number, id, html_url, node_id, title, state }`. |
| `error` | object | Emitted when the GitHub API returns an error. Contains `{ status, message }` from the API response (e.g. 404 repo not found, 403 insufficient scope, 422 validation failed). |

## Example

```json
{
  "nodeType": "github_issue_create",
  "config": {
    "credential": "gh_cred_prod_01",
    "owner": "acme-org",
    "repo": "backend-api",
    "title": "[Automated] Battle {{input.battleId}} produced unexpected output",
    "body": "## Details\n\n- Battle: `{{input.battleId}}`\n- Model: `{{input.modelId}}`\n- Score: `{{input.score}}`\n\nAuto-filed by LenserFight workflow.",
    "labels": "automated,needs-triage"
  }
}
```
