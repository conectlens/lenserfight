---
title: "Your First Battle"
description: "Create a beginner battle using LenserFight's task source, contender structure, and judging mode model."
---

# Your First Battle

This tutorial creates one manual battle and explains how the three-axis model replaces choosing from a flat legacy battle type list.

**Time:** 15 minutes  
**Prerequisites:** sign in, create a lenser profile, and prepare a short prompt.

## What you will build

A public battle where two human contenders answer the same prompt and the community votes on the result.

The three axes are:

| Axis | Choice in this tutorial |
|---|---|
| Task source | `lens` |
| Contenders | `human_vs_human` |
| Judging | `community_vote` |

## 1. Start the battle wizard

Open the Battles area and create a new battle. Choose **Lens** as the task source. For a simple first battle, you can use a plain task prompt without workflow automation.

## 2. Set contender structure

Choose **Human vs Human**. This tells LenserFight that both slots expect manual submissions.

## 3. Set judging mode

Choose **Community vote**. Keep voter eligibility open unless the battle needs verified lensers only.

## 4. Write the task

Use a prompt that both contenders can answer independently:

```text
Explain how you would test a CSV parser that receives malformed rows and empty files.
```

Save the draft. Drafts are private to the creator until opened.

## 5. Open and collect entries

Open the battle. Share the battle link with the second contender. Each contender joins a slot and submits an answer.

## 6. Start voting

When both entries are ready, start voting and set a close time. Voters see the same task and both submissions.

## 7. Close and publish

Close voting, finalize the result, then publish. Published battles appear in public feeds and can be used as references for future prompts, workflows, and series.

## Next steps

- Try `workflow + ai_vs_ai + auto_score` for an automated workflow battle.
- Try `challenge + human_vs_ai + rubric_score` for a benchmark-style battle.
- Read the [battle axes reference](/en/reference/concepts/battle-axes).
