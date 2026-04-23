---
layout: home

hero:
  name: "LenserFight"
  text: "Build Lenses.\nChain Workflows."
  tagline: Developer-first Community Edition for local AI experimentation.
  image:
    light: /favicons/original/ms-icon-310x310.png
    dark: /favicons/white/ms-icon-310x310.png
    alt: LenserFight
  actions:
    - theme: brand
      text: Get Started ->
      link: /tutorials/getting-started/overview
    - theme: alt
      text: Install Locally
      link: /tutorials/getting-started/installation
    - theme: alt
      text: GitHub
      link: https://github.com/connectlens/lenserfight

features:
  - title: Lens-first workflow design
    details: Create reusable lenses, connect them into DAG-based workflows, and iterate on the output path step by step.
    link: /tutorials/walkthroughs/create-a-workflow
    linkText: Create a workflow

  - title: Truthful OSS beta scope
    details: Community Edition focuses on installability, workflow execution, and contributor clarity instead of promising every future product surface.
    link: /explanation/community/open-core-model
    linkText: Open core model

  - title: Direct CLI execution
    details: Use lf run exec for local or BYOK model experiments while the broader automation flows stay in preview.
    link: /reference/cli/run
    linkText: Run commands

  - title: Workflow engine internals
    details: Inspect the execution engine, typed contracts, retries, and streaming model directly in the public repo.
    link: /reference/workflows/execution-engine
    linkText: Execution engine

  - title: Contributor-ready docs
    details: The public docs focus on local setup, workflow reliability, and small, reviewable contributions.
    link: /how-to/contributors/how-to-contribute
    linkText: How to contribute

  - title: Community Edition local setup
    details: Start Supabase locally, seed the OSS schemas, and run the web app from one Nx monorepo.
    link: /reference/database/local-setup
    linkText: Local database setup
---

<div class="lf-home-logo-hero">
  <DocsLogo :size="56" :showWordmark="true" />
</div>

<div class="lf-home-section">

## Start with the workflow loop

<p class="lf-home-sub">Install the repo, create a lens, build a workflow, run it, and iterate. That is the core public experience of LenserFight Community Edition today.</p>

<div class="lf-cta-row">
  <a href="/tutorials/getting-started/installation" class="lf-btn lf-btn-primary">Install locally</a>
  <a href="/tutorials/walkthroughs/create-a-workflow" class="lf-btn lf-btn-outline">Create a workflow</a>
</div>

---

## New here?

<div class="lf-prompts-grid">

<div class="lf-prompt-card">
  <div class="lf-prompt-tag">Start</div>
  <div class="lf-prompt-title">Overview</div>
  <p style="font-size:0.85rem; color: var(--vp-c-text-2); margin: 0.5rem 0 0.75rem;">Understand the current OSS beta scope, the core concepts, and what this repo intentionally does not promise yet.</p>
  <a href="/tutorials/getting-started/overview" style="font-size:0.85rem; font-weight:600; color: var(--vp-c-brand-1);">Read overview -></a>
</div>

<div class="lf-prompt-card">
  <div class="lf-prompt-tag">Build</div>
  <div class="lf-prompt-title">Quickstart</div>
  <p style="font-size:0.85rem; color: var(--vp-c-text-2); margin: 0.5rem 0 0.75rem;">Take the shortest path from install to your first lens and workflow run.</p>
  <a href="/tutorials/getting-started/quickstart" style="font-size:0.85rem; font-weight:600; color: var(--vp-c-brand-1);">Open quickstart -></a>
</div>

</div>

---

## The current loop

```
Create a Lens  ->  Build a Workflow  ->  Run it locally  ->  Inspect and improve
```

Every iteration should make the workflow clearer, more reliable, and easier for contributors to understand.

---

</div>
