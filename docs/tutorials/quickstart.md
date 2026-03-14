# Quickstart

Use this guide to get LenserFight running quickly after installation.

## Start the web app

From the repository root, run:

```bash
npm exec nx serve web
```

This starts the Vite-based web application for local development.

## Start the docs site

If you are working on documentation, run:

```bash
npm exec nx run docs:serve
```

This starts the VitePress site that renders the markdown files in `docs/`.

## Verify the setup

After startup, confirm that:

- the app serves without dependency errors
- the docs site loads correctly if you started it
- your local environment variables are being picked up as expected

## What to do next

- Continue contributor setup in [Development Setup](/contributing/development-setup)
- Read the contribution flow in [Contributing](/community/contributing)
- Review branch and commit rules in [Branching and Versioning](/community/branching)
- Use the [Support](/community/support) guide if you get stuck
