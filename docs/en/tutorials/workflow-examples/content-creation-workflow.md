---
title: Content Creation Workflows
description: Three complete Workflow examples for YouTubers, bloggers, and podcasters — full Lens definitions, parameter wiring, and what each step produces.
---

# Content Creation Workflows

This page shows three complete Workflows for content creators. Each one takes a raw topic or brief and produces a complete, publish-ready content package through a series of connected Lens steps.

## Workflow 1 — YouTube Video Production Pipeline

**Goal:** Go from a topic idea and research notes to a complete video production package: script outline, hook, thumbnail concepts, video description, and short-form repurposing ideas.

**Who it is for:** YouTubers, video educators, developer advocates, and anyone who publishes long-form video content.

### Pipeline overview

```
[1. Topic Clarifier]
        ↓ editorial brief
[2. Script Outline Generator]
        ↓ structured outline + hook
[3. Thumbnail Concept Generator]   ← also receives from Lens 1
        ↓ 3 thumbnail concepts
[4. Video Description Writer]      ← receives from Lens 2
        ↓ SEO-ready description + tags
[5. Shorts Repurposer]             ← receives from Lens 2
        ↓ 3–5 short-form clip ideas (leaf output)
```

> **Parallel branches:** Lens 3, 4, and 5 all run independently once their upstream nodes finish. Wire Lens 1 → Lens 3, Lens 2 → Lens 4, and Lens 2 → Lens 5 as separate edges.

---

### Lens 1 — Topic Clarifier

**Purpose:** Turn a vague topic idea into a focused editorial brief that every downstream step can rely on.

**Template body:**

```
You are an editorial strategist for a YouTube channel. A creator has a topic in mind and needs a
focused production brief before writing begins.

Topic idea:
[[topic]]

Channel context (audience, niche, typical video length):
[[channel_context]]

Research notes or source material (optional):
[[research_notes]]

Produce an editorial brief with these sections:

## Core Angle
One sentence: what unique perspective or argument does this video take? Not just "what is X" but
"X does Y because Z, which most people don't realise."

## Target Viewer
One sentence: who is the ideal viewer? What do they already know? What do they want from this video?

## Search Intent
What question is this viewer typing into YouTube? Write the primary search query in quotes.
List 2 secondary queries.

## Hook Strategy
What is the most surprising, counterintuitive, or emotionally resonant thing about this topic?
This will become the opening hook.

## Key Points (3–5)
The main ideas the video must cover, in the order they should appear. Each point in one sentence.

## What to Avoid
Anything that is off-topic, overdone, or that would make an informed viewer roll their eyes.
```

**Parameters:**

| Label | Type | Required | Help text |
|-------|------|----------|-----------|
| `topic` | Short Text | Yes | e.g. "Why most developers don't understand async/await" |
| `channel_context` | Long Text | No | e.g. "Software engineering channel, 80K subs, 10–20 min videos, audience is mid-level devs" |
| `research_notes` | Long Text | No | Paste any notes, articles, or facts you have gathered |

---

### Lens 2 — Script Outline Generator

**Purpose:** Build a full, timestamped script outline from the editorial brief.

**Template body:**

```
You are a script writer for a YouTube channel. Write a detailed script outline — not the full
script, but enough structure that a presenter can record naturally from it.

Editorial brief:
[[editorial_brief]]

Target video length (minutes):
[[video_length]]

Presentation style:
[[style]]

Produce:

## Opening Hook (0:00–0:45)
Write the exact opening line the presenter should say. Then describe what happens visually
(screen recording, B-roll, whiteboard) for the first 45 seconds.
Goal: make the viewer decide in 10 seconds that this video is worth their time.

## Introduction (0:45–2:00)
What the video covers, why it matters, and a quick credibility signal.

## Main Content Sections
For each key point from the brief:
- Section title (becomes an on-screen chapter marker)
- Duration estimate
- Sub-points to cover
- One concrete example, demo, or story to anchor the concept
- Transition sentence into the next section

## Conclusion (last 90 seconds)
- Summary of the key insight (one sentence)
- The one thing the viewer should do next
- Call to action (subscribe, comment question, related video link)

## B-roll / Visual Notes
List 5–8 specific moments where a visual (code snippet, diagram, screen recording, stock footage)
would improve comprehension. Format: [TIMESTAMP] — [VISUAL DESCRIPTION]
```

**Parameters:**

| Label | Type | Required | Help text |
|-------|------|----------|-----------|
| `editorial_brief` | Long Text | Yes | — |
| `video_length` | Short Text | No | e.g. "12 minutes" |
| `style` | Short Text | No | e.g. "conversational and direct, no filler words, first person" |

**Edge:** Lens 1 output → `editorial_brief`

---

### Lens 3 — Thumbnail Concept Generator

**Purpose:** Produce three distinct, proven thumbnail concepts ready for a designer or image-generation model.

**Template body:**

```
You are a YouTube thumbnail strategist. High-CTR thumbnails follow proven visual patterns.

Video topic and core angle:
[[editorial_brief]]

Generate 3 thumbnail concepts. For each:

### Concept [N]: [Name]
**Visual pattern:** (e.g. Curiosity gap / Reaction face / Before-After / Number list / Red X – Green check)
**Background:** Colour, gradient, or scene in one sentence.
**Foreground subject:** The main visual element — presenter face, product, code, diagram.
**Text overlay:** Exact thumbnail text, max 4 words, title case.
**Why it works:** One sentence on the psychological trigger (curiosity, FOMO, contrast, social proof).
**Image generation prompt:** A detailed prompt suitable for an image model, describing composition,
  colours, style, and subject in 2–3 sentences. Do NOT include text in the prompt — text is
  overlaid separately in a design tool.

After all 3 concepts, recommend which to A/B test first and why.
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `editorial_brief` | Long Text | Yes |

**Edge:** Lens 1 output → `editorial_brief`

---

### Lens 4 — Video Description Writer

**Purpose:** Write an SEO-optimised YouTube description and tag list.

**Template body:**

```
Write a YouTube video description and tag set.

Script outline:
[[script_outline]]

Primary and secondary search queries:
[[search_queries]]

Links and resources to include:
[[links]]

## Description

**First 2 lines (above the fold):**
These appear before "Show more." They must contain the primary search query naturally and give a
strong reason to watch. Write them as a hook, not a summary.

**Body (after Show more):**
- What you'll learn (3–5 bullets, each starting with a verb: "Learn...", "Discover...", "Build...")
- Timestamps (copy the chapter markers from the outline, formatted as MM:SS — Chapter Title)
- Resources mentioned (use [[links]] here)
- About this channel (2 sentences)

Keep the body under 4,900 characters total.

## Tags
15–20 YouTube tags, ordered by specificity:
1. Exact primary search query
2. Long-tail variants
3. Broad category tags

Format: one tag per line, no # symbol.
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `script_outline` | Long Text | Yes |
| `search_queries` | Long Text | No |
| `links` | Long Text | No |

**Edge:** Lens 2 output → `script_outline`

---

### Lens 5 — Shorts Repurposer

**Purpose:** Extract the best moments from the outline and turn them into standalone short-form concepts.

**Template body:**

```
You are a short-form content strategist. Extract high-value moments from a long-form video outline
and adapt them into standalone vertical short concepts.

Full video outline:
[[video_outline]]

Number of shorts to generate:
[[short_count]]

For each short:

### Short [N]: [Title]
**Source moment:** Which section of the main video does this come from?
**Hook (first 3 seconds):** The exact opening line or visual action. You have 3 seconds before
  a viewer swipes. Use a direct challenge, a counterintuitive claim, or an unfinished thought.
**Core content (seconds 4–45):** Bullet points of what happens.
**Ending:** Callback to hook / surprising fact / direct question to comments.
**Caption:** 150 characters maximum, 3 hashtags.
**Standalone test:** Can a viewer understand this short without watching the full video? Explain.

Prioritise moments with strong visual potential or moments that made a sharp point in few words.
```

**Parameters:**

| Label | Type | Required | Help text |
|-------|------|----------|-----------|
| `video_outline` | Long Text | Yes | — |
| `short_count` | Short Text | No | Default: 3 |

**Edge:** Lens 2 output → `video_outline`

---

### Running Workflow 1

Root inputs (user fills at run time):

| Node | Root inputs |
|------|------------|
| Lens 1 | `topic` (required), `channel_context`, `research_notes` |
| Lens 2 | `video_length`, `style` |
| Lens 4 | `search_queries`, `links` |
| Lens 5 | `short_count` |

Leaf outputs: Lens 3 (thumbnail concepts), Lens 4 (description + tags), Lens 5 (shorts package).

---

## Workflow 2 — Blog Post + Social Amplification Pipeline

**Goal:** Turn a topic and angle into a full blog post package: SEO outline, hero image prompt, and ready-to-post social content for LinkedIn, X, and a newsletter.

**Who it is for:** Bloggers, developer advocates, marketing teams, and independent writers.

### Pipeline overview

```
[1. Blog Brief Generator]
        ↓ editorial brief + SEO angle
[2. Blog Outline + SEO Metadata]
        ↓ full outline + meta tags
[3. Hero Image Prompt Builder]     ← also receives from Lens 1
        ↓ image generation prompt
[4. Social Post Generator]         ← receives from Lens 2
        ↓ LinkedIn + X + newsletter snippet (leaf output)
```

---

### Lens 1 — Blog Brief Generator

**Template body:**

```
You are an editorial strategist preparing a blog brief.

Topic and angle:
[[topic_and_angle]]

Target reader:
[[audience]]

Publication (blog name, domain, typical post length):
[[publication]]

Produce:

## Core Argument
The single strongest claim this post will make. Controversial enough to provoke thought,
defensible enough to stand up to scrutiny.

## Reader Promise
Complete this sentence: "After reading this post, the reader will be able to..."

## Competing Content
Describe in one paragraph what the top search results on this topic currently say. Then explain
why this post will be meaningfully different.

## Keyword Strategy
Primary keyword (exact phrase to rank for): one term in quotes.
Secondary keywords: 3–5 related phrases.
Do not chase a keyword that would turn this into a generic explainer if the angle is advanced.

## Call to Action
What should the reader do at the end? Subscribe, share, try something, book a call?
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `topic_and_angle` | Long Text | Yes |
| `audience` | Short Text | No |
| `publication` | Short Text | No |

---

### Lens 2 — Blog Outline + SEO Metadata

**Template body:**

```
Write a complete blog post outline and SEO metadata.

Editorial brief:
[[brief]]

Post length target:
[[word_count]]

## SEO Metadata
- **Title tag** (55–60 characters, contains primary keyword, compelling to click):
- **Meta description** (150–155 characters, contains primary keyword, ends with a verb or benefit):
- **URL slug** (lowercase, hyphenated, under 60 characters):
- **Featured image alt text suggestion:**

## Post Outline

### Introduction (150–200 words)
- Opening hook: one specific sentence — a surprising statistic, a provocative question, or a vivid
  scenario. Do NOT start with "In today's world..." or "Have you ever wondered..."
- Context: 2–3 sentences setting up the problem
- Thesis: the post's core argument in one sentence
- Roadmap: briefly tell the reader what they will learn

### H2 Sections (3–6 sections)
For each H2:
- Heading text (contains a secondary keyword where natural)
- 2–3 H3 sub-sections
- For each H3: 2–3 content bullets and one concrete example slot [EXAMPLE NEEDED]
- Estimated word count

### Conclusion (100–150 words)
- Restate the argument differently from the intro
- Single most important takeaway
- Call to action from the brief

## Internal Linking Opportunities
3 placeholder topics this post could link to within the same publication.
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `brief` | Long Text | Yes |
| `word_count` | Short Text | No |

**Edge:** Lens 1 output → `brief`

---

### Lens 3 — Hero Image Prompt Builder

**Template body:**

```
Create a hero image prompt for a blog post.

Post topic and core angle:
[[brief]]

Brand style (colours, illustration style, photography vs. illustration):
[[brand_style]]

Write a detailed image generation prompt for the hero image. Describe:

1. **Subject:** The main visual element — be specific. Not "a developer at a laptop" but
   "a developer in a dimly lit room, eyes focused on a terminal showing a stack trace, coffee
   cup beside the keyboard."

2. **Composition:** Where is the subject? Foreground vs. background. Rule of thirds position.

3. **Style:** Photorealistic / flat illustration / isometric / 3D render / watercolour.

4. **Colour palette:** 2–3 dominant colours. Use specific colour names or hex codes.

5. **Mood:** The emotional quality — focused, alarming, optimistic, playful, serious, urgent.

6. **What to avoid (negative prompt):** Text in image, watermarks, blurry subjects, generic
   stock photography feel, lens flare, distorted faces.

7. **Aspect ratio:** Standard blog hero is 1200×630 px (1.91:1).

After the prompt, explain in 2 sentences why this image would make a reader stop scrolling.
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `brief` | Long Text | Yes |
| `brand_style` | Short Text | No |

**Edge:** Lens 1 output → `brief`

---

### Lens 4 — Social Post Generator

**Template body:**

```
Write platform-specific social media posts promoting a blog post.

Blog outline and core argument:
[[outline]]

Blog post URL:
[[url]]

Author name:
[[author]]

Write one post per platform. Each must feel native — not a copy-paste from one to another.

---

## LinkedIn Post

- **Line 1:** A bold claim or question. No greeting. No "I'm excited to share..."
- **Lines 2–4:** 3 bullet points, each adding one specific insight that supports the claim
- **Line 5:** The payoff — what the reader gains from the full post
- **Line 6:** Link + a question to drive comments
- **Hashtags:** 3–5 professional hashtags on the last line
- **Length:** 1,200–1,500 characters (LinkedIn rewards longer posts)

---

## X (Twitter) Thread

- **Tweet 1:** The hook — one sentence that stops the scroll. End with 🧵
- **Tweet 2–4:** One key insight per tweet. Short sentences. One idea per tweet. Use line breaks.
- **Tweet 5:** The payoff + link

Each tweet must be under 280 characters. Count carefully.

---

## Newsletter Blurb

- **Paragraph 1:** The problem this post solves — speak directly to the reader's pain point
- **Paragraph 2:** What they will find and a link
- **Length:** 80–100 words. First-person, conversational.
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `outline` | Long Text | Yes |
| `url` | Short Text | No |
| `author` | Short Text | No |

**Edge:** Lens 2 output → `outline`

---

### Running Workflow 2

Root inputs:

| Node | Root inputs |
|------|------------|
| Lens 1 | `topic_and_angle` (required), `audience`, `publication` |
| Lens 2 | `word_count` |
| Lens 3 | `brand_style` |
| Lens 4 | `url`, `author` |

---

## Workflow 3 — Podcast Episode Pipeline

**Goal:** Go from an episode topic to a complete production package: structured episode plan, verbatim intro/outro scripts, show notes, and social clip ideas.

**Who it is for:** Solo and co-hosted podcast producers, audio journalists, and anyone running a regular audio show.

### Pipeline overview

```
[1. Episode Brief]
        ↓ episode brief
[2. Episode Structure Planner]
        ↓ minute-by-minute structure
[3. Intro + Outro Script Writer]    ← receives from Lens 2
        ↓ word-for-word scripts
[4. Show Notes Writer]              ← receives from Lens 2 + Lens 3
        ↓ full show notes page
[5. Social Clips Planner]           ← receives from Lens 2
        ↓ clip ideas + captions (leaf output)
```

---

### Lens 1 — Episode Brief

**Template body:**

```
You are a podcast producer creating an episode brief.

Episode topic:
[[topic]]

Guest name and background (leave blank for solo episodes):
[[guest]]

Podcast name, format, and typical episode length:
[[podcast_context]]

Produce:

## Episode Thesis
One sentence: the single most important idea this episode will leave the listener with.

## Why Now
Why is this topic relevant right now? What triggered this episode?

## Listener Value
Complete: "A listener who finishes this episode will be able to..."

## Interview Questions (guest episodes)
8–10 questions in order. Start easy (context and background), build to the most interesting or
controversial question, end with a forward-looking question.
For each question: the question + a one-line note on what a great answer would include.

## Talking Points (solo episodes)
5–7 main points. For each: the point + one supporting fact, story, or concrete example.

## Episode Tags
5–8 topic tags for podcast directories (Apple Podcasts, Spotify, Overcast).
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `topic` | Long Text | Yes |
| `guest` | Short Text | No |
| `podcast_context` | Short Text | No |

---

### Lens 2 — Episode Structure Planner

**Template body:**

```
Plan the full runtime structure of a podcast episode.

Episode brief:
[[brief]]

Target length (minutes):
[[length]]

Output a timestamped structure:

## Act 1 — Open (first 10% of runtime)
- [0:00] Cold open: the most compelling 30-second moment from the episode, teased as a hook
- [0:30] Intro music cue [MUSIC]
- [1:00] Host intro: what we cover today and why it matters
- [2:00] Guest intro (if applicable): the shortest credible version of who this person is

## Act 2 — Main Content (middle 80%)
Break into chapters. For each chapter:
- Estimated timestamp
- Chapter title (becomes a chapter marker in podcast players that support them)
- Sub-points: what gets covered, in order
- The question or transition line into the next chapter

## Act 3 — Close (last 10%)
- Key takeaway summary: one or two minutes
- Guest links and resources (if applicable)
- Listener call to action
- Outro cue [MUSIC]

## Pacing Notes
Flag any section that risks running over and suggest where to cut if the episode exceeds target.
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `brief` | Long Text | Yes |
| `length` | Short Text | No |

**Edge:** Lens 1 output → `brief`

---

### Lens 3 — Intro + Outro Script Writer

**Template body:**

```
Write verbatim intro and outro scripts for a podcast episode.

Episode structure:
[[structure]]

Host name:
[[host_name]]

Show name:
[[show_name]]

Brand voice (tone, style, any phrases the host always uses):
[[brand_voice]]

## Intro Script (60–90 seconds when read at normal pace)

Structure:
1. Cold open (15 sec): the most compelling quote, stat, or scenario from the episode.
   Start in the middle of the action. Do NOT open with "Welcome to..." or "Hey everyone."
2. [MUSIC FADES IN AND OUT]
3. Host welcome (10 sec): "I'm [[host_name]], and this is [[show_name]]."
4. Episode setup (30 sec): what this episode is about and why the listener should care today.
5. Guest intro (15 sec, guest episodes only): the shortest credible version of who the guest is.

## Outro Script (30–45 seconds)

Structure:
1. Closing thought: one sentence that echoes the episode thesis.
2. Action item: the single most useful thing the listener can do right now.
3. Housekeeping: review ask, subscribe CTA, where to find the guest (if applicable).
4. Sign-off line: "I'm [[host_name]], thanks for listening. See you next [week/episode]."

Write in the brand voice: [[brand_voice]]. Mark all music cues with [MUSIC].
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `structure` | Long Text | Yes |
| `host_name` | Short Text | No |
| `show_name` | Short Text | No |
| `brand_voice` | Short Text | No |

**Edge:** Lens 2 output → `structure`

---

### Lens 4 — Show Notes Writer

**Template body:**

```
Write complete podcast show notes for a website page.

Episode structure and content:
[[structure]]

Intro script:
[[intro]]

Guest name and social links (leave blank for solo episodes):
[[guest_info]]

## Episode Title
SEO-friendly and clickable. Contains guest name (if applicable) and the core topic.
Under 65 characters.

## Episode Description (200–300 words)
Written for someone who has not listened yet. Include:
- The central question or problem
- 3 specific things the listener will learn or hear
- Why this guest or host is worth an hour of attention
Include the primary search query naturally in the first 2 sentences.

## Key Takeaways
5 bullet points. Each starts with a verb. These are the episode's most shareable insights.

## Timestamps
MM:SS — Chapter Title
One line per chapter from the episode structure.

## Links and Resources
Placeholder list for everything mentioned: guest website, tools, books, articles, studies.

## Guest Bio (2–3 sentences, guest episodes only)
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `structure` | Long Text | Yes |
| `intro` | Long Text | No |
| `guest_info` | Short Text | No |

**Edges:**
- Lens 2 output → `structure`
- Lens 3 output → `intro`

---

### Lens 5 — Social Clips Planner

**Template body:**

```
Identify the best moments from a podcast episode and plan them as social media clips.

Episode structure and key content:
[[structure]]

Number of clips to plan:
[[clip_count]]

For each clip:

### Clip [N] — [Title]
**Timestamp range:** Approximate start and end time.
**Why this moment:** What makes it standalone-shareable? (insight, emotion, surprise,
  counterintuitive claim, quotable line)
**Ideal format:** Audiogram / short video with captions / text quote card — and why.
**Platform fit:** Best suited for: LinkedIn / X / Instagram Reels / YouTube Shorts / TikTok.
**Caption:** The exact social caption for the primary platform. Under 150 characters with hashtags.
**Hook text overlay:** 3–5 words to show on screen in the first 2 seconds (for video clips).

After all clips: suggest a **Distribution Schedule** — which clip to post on which day relative
to episode launch for maximum reach.
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `structure` | Long Text | Yes |
| `clip_count` | Short Text | No |

**Edge:** Lens 2 output → `structure`

---

### Running Workflow 3

Root inputs:

| Node | Root inputs |
|------|------------|
| Lens 1 | `topic` (required), `guest`, `podcast_context` |
| Lens 2 | `length` |
| Lens 3 | `host_name`, `show_name`, `brand_voice` |
| Lens 4 | `guest_info` |
| Lens 5 | `clip_count` |

Leaf outputs: Lens 4 (show notes), Lens 5 (social clips plan). Lens 3 (scripts) is also a primary deliverable.

---

## Tips for all content Workflows

**Include your channel or publication context.** The single highest-leverage thing you can do is fill in `channel_context` or `audience` with real specifics. "Mid-level software engineers who are learning distributed systems" produces far better output than "developers."

**Use real topics, not test placeholders.** Run these Workflows with your actual next piece of content. The quality drop when using placeholder inputs like "my topic here" is significant.

**The image prompt output is designed to be used immediately.** Paste the hero image prompt from Lens 3 directly into DALL-E, Imagen, or Stable Diffusion. The negative prompt section is included specifically for models that support it.

**Social posts are starting points, not finished copy.** Read them out loud. Cut anything that sounds like AI wrote it. Add a specific reference — a number, a name, a recent event — that only you would know.

**Thumbnail A/B testing.** Lens 3 always produces 3 concepts. Use YouTube Studio's A/B testing (or upload 2 thumbnails manually via TubeBuddy or VidIQ) with the top 2 concepts. Check after 48 hours.

---

*Next: [Finance Workflows →](./finance-workflow)*
