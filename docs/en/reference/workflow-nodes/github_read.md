---
title: GitHub Read
description: Reads file or repository contents from GitHub.
---

# GitHub Read

## Overview

The GitHub Read node fetches file contents or directory listings from a GitHub repository using the GitHub REST API. It requires a configured GitHub credential (personal access token or OAuth) and supports both public and private repositories. On success it emits the decoded file content and metadata; on failure it routes to the error port with a structured error object containing the HTTP status and message.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `credential_id` | string | Yes | ID of the stored GitHub credential (PAT or OAuth token) used to authenticate API requests. |
| `owner` | string | Yes | GitHub repository owner — either a username or organization name (e.g. 'acme-corp'). |
| `repo` | string | Yes | Repository name, without the owner prefix (e.g. 'my-repo'). |
| `path` | string | Yes | Path to the file or directory within the repository (e.g. 'src/index.ts'). Use an empty string or '/' for the root. |
| `ref` | string | No | Branch name, tag, or full commit SHA to read from. Defaults to the repository's default branch if omitted. |
| `encoding` | enum | No | Output encoding for file content. Options: 'utf8' (default) or 'base64'. Use 'base64' for binary files. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | Trigger signal. May carry dynamic overrides for 'owner', 'repo', 'path', or 'ref' that take precedence over static config values. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Emitted on success. Contains 'content' (decoded file string or array of directory entries), 'sha' (blob SHA), 'size' (bytes), 'encoding', and 'html_url'. |
| `error` | object | Emitted when the request fails (e.g. 404 not found, 401 unauthorized, rate limit exceeded). Contains 'status' (HTTP code), 'message', and 'path' that was requested. |

## Example

```json
{
  "nodeType": "github_read",
  "config": {
    "credential_id": "cred_gh_prod_pat",
    "owner": "acme-corp",
    "repo": "model-prompts",
    "path": "prompts/judge-v2.md",
    "ref": "main"
  }
}
```
