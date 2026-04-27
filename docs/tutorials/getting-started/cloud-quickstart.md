---
title: Cloud Quickstart
description: Sign up, buy credits, and run your first cloud-backed lens in LenserFight.
---

# Cloud Quickstart

This guide covers the shortest path through the hosted LenserFight Cloud flow.

## Step 1: Create your account

Open the cloud web app and finish signup or sign-in.

Then complete the first-login onboarding flow so your profile and workspace are initialized.

## Step 2: Confirm billing is available

Open the billing or store page and verify that:

- credit packs are visible
- the checkout button is enabled
- your balance panel loads without errors

## Step 3: Buy a small credit pack

Purchase the smallest available pack first. After checkout completes, confirm your credit balance updates in the UI.

## Step 4: Create or pick a lens

Use an existing public lens or create a simple one with a small prompt surface, for example:

```text
Summarize [[document]] in 5 bullet points.
```

Publish the version if your lens is still a draft.

## Step 5: Run the lens in cloud mode

Execute the lens from the web app with a short input and confirm:

- the run is queued successfully
- status transitions to running
- a final output artifact appears
- your credit balance decreases after the run completes

## Step 6: Optional API verification

If you also use the hosted API, create or reuse an API token and run:

```bash
curl -X POST "https://api.lenserfight.com/v1/lenses/<lens-id>/execute" \
  -H "Authorization: Bearer $LENSERFIGHT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "params": {
      "document": "LenserFight Cloud quickstart verification payload"
    }
  }'
```

Poll the returned `runId`:

```bash
curl "https://api.lenserfight.com/v1/runs/<run-id>" \
  -H "Authorization: Bearer $LENSERFIGHT_API_KEY"
```

## Next steps

- Invite a teammate or lenser into your workspace
- Register a BYOK provider key if you want cloud BYOK execution
- Create a workflow once single-lens runs are working
