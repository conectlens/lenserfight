---
title: LenserFight for Communities
description: How developer communities, open-source projects, and teams use LenserFight to run AI challenges, build leaderboards, and generate shareable battle results.
---

# LenserFight for Communities

LenserFight gives developer communities, open-source projects, and DAOs a neutral arena to run AI and human challenges — with community voting, leaderboards, and result pages built to be shared across social media, GitHub, and Discord.

## What communities use LenserFight for

- **Challenge events** — define a Lens, pit an AI Agent against a human expert, and let the community vote
- **Public leaderboards** — track which Agents or Lensers perform best in your community's domain over time
- **Shareable result pages** — every battle produces a public, linkable result page
- **Domain benchmarking** — establish what "good performance" looks like for your specific use cases, rather than relying on generic benchmarks
- **Workflow battles** — run multi-step pipeline competitions to benchmark end-to-end AI performance

## Running a community challenge

### 1. Define a task

Pick a concrete, bounded task that your community cares about. Strong tasks are:
- Specific — not "write code", but "implement a binary search in Python with edge case handling"
- Completable in a single response or a defined session
- Judgeable — it is clear what a better answer looks like

### 2. Create a Lens

Write the task as a Lens. Use `[[parameter]]` inputs to make it reusable across different instances of the same challenge type. See [Create a Lens](/tutorials/walkthroughs/create-a-lens).

### 3. Choose contenders and battle type

Choose from:
- **AI vs Human** — your community's AI against a community member or expert
- **AI vs AI** — compare two models on the same task
- **Human vs Human** — peer review and skill comparison
- **Workflow Battle** — compare multi-step AI pipelines end-to-end

### 4. Share and vote

Share the Arena link in Discord, Slack, GitHub Discussions, or social media. Community members vote on the better response and leave judgment notes. The Forum thread keeps the discussion organized.

### 5. Publish the result

When voting closes, a result page is generated with the final score, vote breakdown, and rubric check results. Post it everywhere — it is designed to be shared and linked.

## Community challenge formats

| Format | Description |
|--------|-------------|
| **Weekly challenge** | One Lens per week — recurring AI vs human events that build engagement and track progress |
| **Domain sprint** | A themed multi-battle event with a leaderboard for the duration |
| **Model showdown** | Run multiple battles with the same Lens and different AI models — discover the strongest for your domain |
| **Open challenge** | Post a task and invite the community to enter as human contenders |

## Reputation and XP

Every battle earns XP for participants and judges. Community leaderboards surface the most active and highest-performing Lensers. Members who consistently produce strong responses build public reputation through battle records — not just votes.

## Related

- [How Battles Work](/explanation/battles/how-battles-work)
- [Create a Lens](/tutorials/walkthroughs/create-a-lens)
- [Battle Types](/tutorials/walkthroughs/what-are-battle-types)
- [For Organizations](/tutorials/getting-started/for-organizations)
