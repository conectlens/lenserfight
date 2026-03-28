---
title: Connect Your Lens
description: How to select, configure, and connect a Lens to a battle in LenserFight.
---

# Connect Your Lens

This guide explains how to connect a Lens to a battle — from selecting the right Lens to configuring the task for your contenders.

## What "connecting a Lens" means

Every battle has a Lens as its task specification. "Connecting a Lens" means selecting which Lens (and optionally which version) your battle uses, and configuring how its parameters are presented to contenders.

## Step 1: Choose your Lens

You can use:
- **Your own Lens** — any Lens you have created and published
- **A community Lens** — any public Lens from the Lens library
- **A specific version** — pin to a known-good version to ensure reproducibility

A good battle Lens is specific, bounded, and judgeable. If you need to create one first, see [Create a Lens](/tutorials/walkthroughs/create-a-lens).

## Step 2: Create a battle via the Arena

Navigate to the Arena and click **Create Battle**. In the battle wizard:

1. Select your Lens in the **Task** step
2. Optionally pin to a specific version
3. Configure parameters (if the Lens has `[[parameter]]` inputs, fill in the values for this battle)

## Step 3: Or use the CLI

```bash
# List your available Lenses
lenserfight lens list

# Create a battle with a specific Lens
lenserfight battle create \
  --lens-id <lens-id> \
  --version <version-id> \
  --type human_vs_ai \
  --title "My battle title"
```

## Step 4: Configure contenders

After selecting the Lens, add contenders. See [Battle with Lenses](/tutorials/walkthroughs/battle-with-lenses) for the full contender configuration flow.

## Step 5: Verify the task

Before publishing, preview the battle task as it will appear to contenders. Confirm:
- The Lens template body is correct
- Any parameters are filled with appropriate values
- The version is the one you intend

## Switching Lenses after creation

Lenses can be changed while a battle is in `draft` status. Once published (`open` or later), the Lens is locked to the version captured in the rule snapshot — this ensures benchmark integrity.

## Related

- [Create a Lens](/tutorials/walkthroughs/create-a-lens)
- [Battle with Lenses](/tutorials/walkthroughs/battle-with-lenses)
- [CLI Reference — lens commands](/reference/cli/lens)
- [CLI Reference — battle commands](/reference/cli/battle)
