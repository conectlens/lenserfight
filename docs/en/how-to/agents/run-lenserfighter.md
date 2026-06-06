---
title: Run the LenserFighter Autonomous Contributor
description: Install and operate @lenserfighter — an autonomous AI Lenser that reviews PRs, triages issues, and drafts fix PRs for your repository on a daily schedule, without merging.
---

# Run the LenserFighter Autonomous Contributor

**LenserFighter** is an autonomous AI Lenser that contributes to a GitHub repository on a
schedule. Each run does **one** thing — review an open PR, triage and open one issue, or draft
one small fix PR — and then stops. It **never merges** and never pushes to protected branches,
so every contribution still goes through your normal CI and human review.

- **On GitHub** it acts as the `lenserfighter[bot]` GitHub App.
- **In the LenserFight product** it is the `@lenserfighter` AI Lenser.

The runtime is a GitHub Actions workflow ([`.github/workflows/lenserfighter.yml`](https://github.com/conectlens/lenserfight/blob/development/.github/workflows/lenserfighter.yml))
that runs [`anthropics/claude-code-action`](https://github.com/anthropics/claude-code-action) —
the same way Claude contributes to GitHub repositories. Its behavior is defined entirely by the
persona file [`.lenserfight/lensers/lenserfighter/LENSER.MD`](https://github.com/conectlens/lenserfight/blob/development/.lenserfight/lensers/lenserfighter/LENSER.MD).

> The workflow ships **inert**: until you add the GitHub App secrets it skips every scheduled
> run with a notice, so you never get a daily failing cron before setup is complete.

---

## What it does each run

| Focus                 | Action                                                                                                                | Writes?         |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------- |
| `review-prs`          | Posts one structured review comment on the most recently updated PR it has not already reviewed.                      | Comment only    |
| `triage-issues`       | Opens one well-formed, **deduped** issue using the matching issue template.                                           | One issue       |
| `draft-fix`           | Picks one `good-first-issue`, implements the minimal fix on a `lenserfighter/` branch, opens a PR into `development`. | One branch + PR |
| `auto` (cron default) | Rotates the three focuses by day-of-week so cost stays at one action per day.                                         | Varies          |

It **never** merges, approves, force-pushes, runs migrations, or opens duplicates. See the
[persona file](https://github.com/conectlens/lenserfight/blob/development/.lenserfight/lensers/lenserfighter/LENSER.MD)
for the complete behavior contract.

---

## Prerequisites

- A repository where you can add Actions secrets and (optionally) install a GitHub App.
- A Claude Code OAuth token (`CLAUDE_CODE_OAUTH_TOKEN`) — the repository already uses this for
  the Claude issue-fix workflow.

---

## Step 1 — Create the GitHub App

A GitHub App gives the agent its own bot identity (`lenserfighter[bot]`) and short-lived,
repo-scoped install tokens — more secure than a personal access token, and installable by anyone.

1. Go to **Settings → Developer settings → GitHub Apps → New GitHub App** (under the
   `lenserfight` account, your own account, or your org).
2. Name it (e.g. `LenserFighter`). The contribution actor becomes `<app-name>[bot]`.
3. **Webhook:** uncheck _Active_ — no webhook is needed.
4. **Repository permissions:**
   - **Contents:** Read and write
   - **Pull requests:** Read and write
   - **Issues:** Read and write
5. Create the App, then **generate a private key** (downloads a `.pem`) and note the **App ID**.

## Step 2 — Install the App

From the App's page, **Install App** and select the target repository
(`connectlens-org/lenserfight` or your fork). Installing it is what grants it write access — no
separate collaborator step is needed.

## Step 3 — Add the secrets

In the target repo: **Settings → Secrets and variables → Actions → New repository secret**.

| Secret                          | Value                                                    |
| ------------------------------- | -------------------------------------------------------- |
| `LENSERFIGHTER_APP_ID`          | The App ID from Step 1                                   |
| `LENSERFIGHTER_APP_PRIVATE_KEY` | The full contents of the downloaded `.pem`               |
| `CLAUDE_CODE_OAUTH_TOKEN`       | Your Claude Code OAuth token (reused if already present) |

The moment `LENSERFIGHTER_APP_ID` exists, the next scheduled run activates.

## Step 4 — Run it

- **Daily:** the workflow runs automatically at 07:00 UTC with `focus: auto`.
- **On demand:** go to **Actions → LenserFighter Autonomous Contributor → Run workflow**, pick a
  `focus`, and optionally pass a free-text `task` to override the focus playbook for that run.

Watch a few manual runs (start with `review-prs`) before relying on the cron.

---

## Tuning

- **Change the focus mix:** edit the day-of-week rotation in the _Resolve focus for this run_
  step of the workflow.
- **Change cadence:** edit the `schedule.cron` expression. Keep it coarse (daily) — one unit of
  work per run keeps token and CI cost bounded.
- **Change the model / turn budget:** edit `claude_args` (`--model`, `--max-turns`).
- **Change behavior:** edit the persona file `.lenserfight/lensers/lenserfighter/LENSER.MD`. The
  workflow reads it at runtime, so behavior changes do not require touching the workflow.

## Cost

Each run is one Claude Code session bounded by `--max-turns` and a single task, scheduled at most
once per day. There are no retries or fan-out, so spend is predictable. Raising the cadence or
turn budget raises cost proportionally.

## Safety and pausing

- **Never merges.** Every change lands as a PR for human review behind your existing CI gates.
- **Pause instantly** by disabling the workflow (**Actions → ⋯ → Disable workflow**) or
  uninstalling the GitHub App — either one is an immediate kill switch.
- All write actions are attributed to `lenserfighter[bot]`, so its contributions are easy to
  audit and filter.

## Related

- [What is an Agent](/en/explanation/agents/what-is-an-agent)
- [Agent Boundaries](/en/explanation/agents/agent-boundaries)
- [Manage Agent Settings](/en/how-to/agents/manage-agent-settings)
