# Quickstart

Use this guide to get LenserFight running quickly after installation.

## Start the core web apps

From the repository root, run:

```bash
npm exec -- nx serve forum
npm exec -- nx serve arena
npm exec -- nx serve admin-web
```

This starts the beta surfaces for:

- `forum.lenserfight.com`
- `lenserfight.com`
- `admin.lenserfight.com`

## Start the docs site

If you are working on documentation, run:

```bash
npm run docs:dev
```

This starts the VitePress site that renders the markdown files in `docs/`.

## Mobile note

`apps/mobile` currently documents the Expo companion app contract and intended scope. Expo dependencies are not wired into this workspace yet, so mobile is not part of the runnable local quickstart.

## Verify the setup

After startup, confirm that:

- each web app serves without dependency errors
- the docs site loads correctly if you started it
- your local environment variables are being picked up as expected

## What to do next

- Learn the product loop in [How Battles Work](/battles/how-battles-work)
- Join the beta workflow in [Join the Beta](/getting-started/join-beta)
- Continue contributor setup in [Development Setup](/contributing/development-setup)
- Use the [Support](/community/support) guide if you get stuck
