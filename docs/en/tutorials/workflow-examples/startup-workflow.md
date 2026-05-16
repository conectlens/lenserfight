---
title: Startup Workflows
description: Three complete Workflow examples for early-stage founders — weekly operating review, product launch preparation, and hiring pipeline — with full Lens definitions.
---

# Startup Workflows

This page shows three complete Workflows for founders and early-stage teams. These pipelines are optimised for speed: small teams with broad responsibilities who need structured, high-quality outputs without spending hours writing from scratch.

---

## Workflow 1 — Weekly Operating Review

**Goal:** Convert your weekly team notes, metrics, and blockers into a structured operating memo that drives decisions, not just discussions.

**Who it is for:** Founders and operators running a weekly team or leadership sync. Especially useful when you need a written record of decisions and a clear set of priorities for the coming week.

### Pipeline overview

```
[1. Notes Ingestion]
        ↓ structured weekly data
[2. Decision Identifier]
        ↓ decisions needed + owners
[3. KPI Reviewer]
        ↓ metric commentary
[4. Weekly Memo Writer]
        ↓ final operating memo (leaf output)
```

---

### Lens 1 — Notes Ingestion

**Purpose:** Take messy weekly notes — Slack threads, voice memos, bullet points, status updates — and convert them into clean, categorised data that the downstream steps can work from.

**Template body:**

```
You are an executive assistant structuring a founder's weekly notes into a clean briefing.

Raw weekly notes (Slack messages, voice memo transcript, bullet points, email threads — paste
everything from this week):
[[raw_notes]]

Company stage and team size:
[[context]]

Week ending date:
[[week_ending]]

Structure the notes into categories. Do not interpret or editorialize — only organise what is there.

## What Shipped This Week
Everything that was completed, launched, released, or closed. One bullet per item.
Format: [Date or "This week"] — [What shipped] — [Who shipped it]

## What Is In Progress
Work that started this week but is not yet done. Include expected completion.
Format: [Item] — [Owner] — [Expected completion]

## Blockers and Issues
Anything slowing the team down. For each:
- The blocker
- Who is affected
- Is a decision needed to unblock it? (Yes / No)

## Team Updates
Anything related to people: new hires, departures, performance conversations, mood, capacity issues.

## Upcoming Events / Deadlines
Anything with a fixed date in the next 2 weeks.

## Loose Threads
Items mentioned but not categorised — things that need a follow-up conversation.

Flag items that seem urgent but were not explicitly called out as urgent with ⚡.
```

**Parameters:**

| Label | Type | Required | Help text |
|-------|------|----------|-----------|
| `raw_notes` | Long Text | Yes | Paste everything: Slack, notes, emails, bullet points |
| `context` | Short Text | No | e.g. "B2B SaaS, 8-person team, post-seed" |
| `week_ending` | Short Text | No | e.g. "2026-05-16" |

---

### Lens 2 — Decision Identifier

**Purpose:** Identify every decision that needs to be made this week, who should make it, and what information is needed.

**Template body:**

```
You are a chief of staff helping a founding team identify and prioritise decisions.

Structured weekly notes:
[[structured_notes]]

Extract and structure every decision that needs to be made:

For each decision:

### Decision [N]: [Short title]
**Context:** What situation triggered this decision? (1–2 sentences)
**Decision needed:** State the decision as a clear, specific question the team can answer with a
  choice. Bad: "What should we do about pricing?" Good: "Should we increase the starter plan from
  $29 to $49 starting June 1?"
**Who decides:** The role or name of the person with the authority and information to decide.
**By when:** When does this need to be decided to avoid a downstream problem?
**Options:** List 2–3 concrete options. For each option: what it means and the main tradeoff.
**Information needed:** What data or input would make this decision clearer?
**Urgency:** Decide today / This week / Next week / No rush

After listing all decisions, produce:

## Decision Priority Stack
Rank all decisions by urgency and impact. The decision at the top needs an answer before the
team can move on other things.

## Decisions That Can Wait
Any decision that appeared in the notes but is not actually time-sensitive this week. Better to
decide fewer things well than many things poorly.
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `structured_notes` | Long Text | Yes |

**Edge:** Lens 1 output → `structured_notes`

---

### Lens 3 — KPI Reviewer

**Purpose:** Take this week's key metrics and produce a short, honest commentary on performance — what moved, why it matters, and what the team should watch next week.

**Template body:**

```
You are a startup operator reviewing weekly key performance indicators.

This week's metrics (paste your dashboard data or written numbers):
[[metrics]]

Company goals for this quarter (OKRs, targets, or written goals):
[[quarterly_goals]]

Write a KPI commentary:

## Metric Snapshot

| Metric | This Week | Last Week | Change | On Track? |
|--------|-----------|-----------|--------|-----------|

On Track values: ✅ Yes / ⚠️ Borderline / 🔴 No / — No target

## What Moved and Why
For each metric that changed by more than 10% (positive or negative):
- What changed
- The most likely explanation (based on the data and your knowledge of this week's events)
- Whether this change is meaningful or noise

## Most Important Metric This Week
One metric that deserves disproportionate attention — and a one-paragraph explanation of why.

## Early Warning Signs
Any metric that is still "on track" but trending in a direction that could become a problem
in 2–4 weeks if the trend continues.

## What to Watch Next Week
The 2–3 metrics the team should pay attention to in the coming 7 days, and why.

> For informational use only. Verify figures against source-of-truth systems before distribution.
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `metrics` | Long Text | Yes |
| `quarterly_goals` | Long Text | No |

---

### Lens 4 — Weekly Memo Writer

**Purpose:** Combine everything into a clean, structured operating memo that serves as the single source of truth for the week.

**Template body:**

```
Write a weekly operating memo for a startup founding team.

Structured notes:
[[notes]]

Decision stack:
[[decisions]]

KPI commentary:
[[kpis]]

Company name and week ending:
[[meta]]

Write the memo:

---
# Weekly Operating Memo — [WEEK ENDING]
*[[company_name]] | Internal use only*

## The Week in 60 Seconds
3 bullet points. One thing that went well, one thing that did not, one thing that is coming.
These should be the first thing anyone reads — make each bullet a complete thought.

## What Shipped
Reproduce the "What Shipped" list from the structured notes, formatted cleanly.

## Decisions Required
Reproduce the Decision Priority Stack. For each decision:
- The decision question
- Who decides
- Deadline
- Options (one line each)

Mark any decision that blocks another team member from moving forward with 🔴.

## Metrics Snapshot
Reproduce the KPI table. After the table, include the "Most Important Metric" commentary.

## Top 3 Priorities for Next Week
What are the three most important things the team should accomplish?
Format: [Priority] — [Owner] — [Success criteria]

These must be specific enough that someone could look at them on Friday and say objectively
whether each one was achieved.

## Blockers Requiring Resolution
Any blocker from the notes that requires someone outside the team (an investor, a vendor, a
partner, a hire) to act.

## Open Questions
Items from "Loose Threads" that need a follow-up conversation or further information before
a decision can be made.

---
*This memo is for internal use. Metrics are preliminary. Not financial advice.*
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `notes` | Long Text | Yes |
| `decisions` | Long Text | Yes |
| `kpis` | Long Text | No |
| `meta` | Short Text | No |

**Edges:**
- Lens 1 output → `notes`
- Lens 2 output → `decisions`
- Lens 3 output → `kpis`

---

### Running Workflow 1

Root inputs:

| Node | Root inputs |
|------|------------|
| Lens 1 | `raw_notes` (required), `context`, `week_ending` |
| Lens 3 | `metrics` (required), `quarterly_goals` |
| Lens 4 | `meta` |

---

## Workflow 2 — Product Launch Preparation Pipeline

**Goal:** Turn a product brief into a complete launch package: a clear positioning statement, landing page copy, launch checklist, and the first social posts.

**Who it is for:** Founders and product marketers preparing an MVP launch, a feature release, or a public beta. Also useful for building the narrative for investor conversations.

### Pipeline overview

```
[1. Positioning Workshop]
        ↓ positioning statement + messaging pillars
[2. Landing Page Copywriter]
        ↓ full page copy
[3. Launch Checklist Generator]    ← receives from Lens 1
        ↓ launch checklist
[4. Launch Social Posts]           ← receives from Lens 2
        ↓ launch posts for LinkedIn + X (leaf output)
```

---

### Lens 1 — Positioning Workshop

**Purpose:** Work through the classic positioning questions to arrive at a sharp, defensible positioning statement and the messaging pillars that flow from it.

**Template body:**

```
You are a product marketer facilitating a positioning workshop.

Product brief (what it does, who it is for, how it works):
[[product_brief]]

Target customer profile (role, company size, industry, key frustrations):
[[target_customer]]

Top 2–3 competitors and how you differ:
[[competitive_context]]

Work through each positioning question:

## 1. For Whom?
Define the target customer as specifically as possible. Not "developers" — "mid-level backend
engineers at Series A–B SaaS companies who are responsible for API design decisions."

## 2. What Category?
What category does this product compete in? What word would a customer use to describe it to a
colleague in one sentence? (e.g. "it's a code review tool", "it's a deployment pipeline")

## 3. What Value?
The single most important outcome the customer gets. Not a feature — an outcome.
"You ship faster" / "You catch regressions before users do" / "You stop losing deals to pricing confusion"

## 4. Against Whom?
The primary alternative the customer would use if your product did not exist. This may be a
competitor, a manual process, or doing nothing.

## 5. What Differentiates You?
The one or two things you do that the alternative cannot match. Must be verifiable, not vague.
"The only X that does Y" — where Y is specific and demonstrable.

## Positioning Statement
A complete positioning statement:
"For [target customer] who [key frustration or goal], [product name] is a [category] that
[core value]. Unlike [primary alternative], [product name] [key differentiator]."

## Messaging Pillars (3)
Three supporting claims that back up the positioning. For each:
- The claim (one sentence)
- The proof point (evidence, stat, or demo that makes it credible)
- The objection it addresses (what a sceptical prospect would say against this)
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `product_brief` | Long Text | Yes |
| `target_customer` | Long Text | Yes |
| `competitive_context` | Long Text | No |

---

### Lens 2 — Landing Page Copywriter

**Purpose:** Write complete, conversion-focused landing page copy based on the positioning statement and messaging pillars.

**Template body:**

```
Write landing page copy for a product launch.

Positioning statement and messaging pillars:
[[positioning]]

Target customer profile:
[[target_customer]]

Key features to highlight (optional):
[[key_features]]

Tone of voice (e.g. direct and technical / friendly and human / bold and provocative):
[[tone]]

Write complete copy for each section of a standard landing page:

## Hero Section
- **Headline** (6–10 words): The single most important thing a visitor should understand in 3
  seconds. Uses the positioning value, not the category.
- **Subheadline** (15–20 words): Expands the headline with the "for whom" and the proof.
- **Primary CTA button text** (2–4 words):
- **Secondary CTA** (optional, e.g. "Watch demo"):
- **Hero visual description**: What image or animation would make this headline more credible?

## Problem Section (optional but recommended)
3–4 sentences describing the painful status quo. Write from the customer's perspective, in
their language. No product mention yet.

## Solution Section
3 benefit blocks. For each:
- Benefit headline (the outcome, not the feature)
- 2–3 sentences explaining how the product delivers this outcome
- One supporting proof point (stat, quote placeholder, or case study reference)

## Social Proof Section
- 3 testimonial placeholders: [QUOTE — Name, Role, Company]
- 2 logo bar placeholders: [CUSTOMER LOGO]
- One metric placeholder: [KEY METRIC, e.g. "Trusted by 500+ teams"]

## How It Works Section
3–5 steps. For each: a number, a short label, and one sentence description.

## Pricing Section
If pricing is public: describe the tier structure and the recommended "most popular" tier.
If pricing is private or usage-based: write a "Talk to us" section.

## Final CTA Section
- Closing headline (5–8 words, echoes the hero headline with urgency or specificity)
- 2–3 sentences of reassurance (easy to cancel, free trial, setup time, etc.)
- Primary CTA button

## SEO Metadata
- Page title (55–60 characters):
- Meta description (150–155 characters):
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `positioning` | Long Text | Yes |
| `target_customer` | Long Text | Yes |
| `key_features` | Long Text | No |
| `tone` | Short Text | No |

**Edge:** Lens 1 output → `positioning`

---

### Lens 3 — Launch Checklist Generator

**Purpose:** Build a detailed, prioritised launch checklist specific to your product type, distribution channel, and team size.

**Template body:**

```
Generate a product launch checklist.

Positioning statement and product description:
[[positioning]]

Launch type:
[[launch_type]]

Team size and available resources:
[[team_context]]

Launch date target (if known):
[[launch_date]]

Generate a detailed, prioritised launch checklist. Organise by category:

## Pre-Launch (complete before going live)
For each item:
- [ ] Task description — [Owner role] — [Suggested timeline relative to launch: -4 weeks, -1 week, -1 day]
- Priority: 🔴 Must-have (launch fails without this) / ⚠️ Should-have / 🟢 Nice-to-have

Categories to cover:
- Product readiness (feature completeness, performance, security review)
- Infrastructure (monitoring, error tracking, backup, rollback plan)
- Legal and compliance (terms of service, privacy policy, cookie notice, GDPR if EU-facing)
- Marketing assets (landing page, product screenshots, demo video, press kit)
- Distribution (launch platforms: Product Hunt, Hacker News, Reddit, newsletters, communities)
- Internal readiness (support docs, onboarding flow, team briefing)

## Launch Day
- [ ] Items to execute on the day of launch, in chronological order

## Post-Launch (first 2 weeks)
- [ ] Monitoring and response tasks
- [ ] Follow-up content and outreach
- [ ] Data collection and learning

## Anti-checklist: Things Not To Do
List 5 common launch mistakes specific to [[launch_type]] and how to avoid them.
```

**Parameters:**

| Label | Type | Required | Help text |
|-------|------|----------|-----------|
| `positioning` | Long Text | Yes | — |
| `launch_type` | Short Text | No | e.g. "Product Hunt launch", "closed beta", "public SaaS launch", "mobile app" |
| `team_context` | Short Text | No | e.g. "2-person founding team, no marketing budget" |
| `launch_date` | Short Text | No | — |

**Edge:** Lens 1 output → `positioning`

---

### Lens 4 — Launch Social Posts

**Purpose:** Write platform-native launch posts for LinkedIn and X that are authentic, not spammy.

**Template body:**

```
Write social media launch posts for a product launch.

Landing page copy:
[[landing_page_copy]]

Positioning statement:
[[positioning]]

Founder name and company:
[[founder_info]]

Launch date:
[[launch_date]]

Write one post for each platform:

---

## LinkedIn Launch Post

Format:
- **Opening line:** A personal sentence about the moment — not "I'm excited to announce" but
  something true and specific: "We've been building [X] for [N] months. Today it's live."
- **What it is:** 2–3 sentences. Who it's for and the core problem it solves.
- **Why we built it:** A brief honest story — what frustrated us, what we tried, why existing
  tools failed.
- **What it does:** 3 specific things the product does (features framed as outcomes, not features).
- **The ask:** One specific action (sign up link, book a demo, or try it free).
- **Tag:** Relevant people or communities (use [TAG PLACEHOLDER] format).

Length: 1,500–2,000 characters. Personal, not press-release.

---

## X (Twitter) Launch Thread

- **Tweet 1:** "We just launched [Product Name]. [One-sentence description of the core value].
  🧵 Here's what it does and why we built it."
- **Tweet 2:** The problem. What does the customer experience before your product? One vivid sentence.
- **Tweet 3:** The insight. What did you learn or realise that made you build this?
- **Tweet 4:** What it does — 3 bullets.
- **Tweet 5:** A social proof signal (if available: beta users, waitlist size, early results).
- **Tweet 6:** The CTA + link.

Each tweet under 280 characters. Use line breaks, not paragraph prose.

---

## Founder Note to Early Users (for onboarding email or community post)

A personal 150-word note from the founder to the first users. Tone: honest, grateful, and
specific about what you want feedback on. Not a marketing email — a real note from a person
who built something and wants it to matter.
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `landing_page_copy` | Long Text | Yes |
| `positioning` | Long Text | Yes |
| `founder_info` | Short Text | No |
| `launch_date` | Short Text | No |

**Edges:**
- Lens 2 output → `landing_page_copy`
- Lens 1 output → `positioning`

---

## Workflow 3 — Hiring Pipeline

**Goal:** Go from a vague hiring need to a complete hiring package: a precise job description, a structured interview guide, and an evaluation rubric.

**Who it is for:** Early-stage founders hiring their first employees, and hiring managers who want structured, consistent interviews.

### Pipeline overview

```
[1. Role Definition Workshop]
        ↓ precise role spec
[2. Job Description Writer]
        ↓ full job description
[3. Interview Guide Generator]
        ↓ structured interview questions
[4. Evaluation Rubric Writer]
        ↓ scoring rubric (leaf output)
```

---

### Lens 1 — Role Definition Workshop

**Purpose:** Get specific about what you actually need before writing a job description — this is where most startups go wrong, hiring for a vague role and being surprised by a vague candidate.

**Template body:**

```
You are a talent advisor helping a founder define a new hire precisely.

Hiring need (rough description of the role, what triggered it, what problem it solves):
[[hiring_need]]

Company stage and team:
[[company_context]]

Budget range (optional):
[[budget]]

Work through these questions to produce a precise role spec:

## Why This Role Exists
One sentence: what specifically happens at the company that is not happening today because this
role is unfilled? Not "we need help with X" — "we are losing $[X] per month / missing [Y] deals /
shipping 30% slower because we lack someone who can Z."

## The 90-Day Success Definition
What does this person need to have accomplished in their first 90 days for the hire to be
considered successful? List 3–5 specific, measurable outcomes.

## Must-Have Skills and Experience
List the skills without which a candidate cannot succeed in this role. Be strict — every item
on this list will filter out candidates.

## Nice-to-Have Skills
Skills that would accelerate ramp-up but are not blocking. A candidate without these can still
be great.

## What Great Looks Like vs. What Good Looks Like
Describe a great candidate and a merely good candidate. What separates them?

## Red Flags for This Role
The specific failure modes for this position — things that have caused people in similar roles
to fail at companies at this stage.

## Reporting and Collaboration
Who does this person report to? Who do they work with most closely? What does their first week look like?

## Compensation Philosophy
Is this a senior hire expecting equity? A specialist expecting market salary? A generalist who
values mission over pay? This shapes the JD tone.
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `hiring_need` | Long Text | Yes |
| `company_context` | Long Text | No |
| `budget` | Short Text | No |

---

### Lens 2 — Job Description Writer

**Purpose:** Write a job description that attracts the right candidates and filters out the wrong ones — honest, specific, and compelling.

**Template body:**

```
Write a job description.

Role spec:
[[role_spec]]

Company description and culture:
[[company_description]]

Tone (e.g. direct and technical / warm and mission-driven / bold and ambitious):
[[tone]]

Write a complete job description:

## [Role Title] at [Company Name]

### About Us (3–4 sentences)
What the company does, who we serve, and why it matters. End with one sentence on where we are
in our journey (stage, traction, team size). No fluff.

### The Role (2 paragraphs)
Paragraph 1: What this person will own and why it matters for the company's trajectory.
Paragraph 2: What the first 90 days will look like.

### What You'll Do
5–7 bullet points. Each starts with a strong verb. Specific responsibilities, not generic ones.
Bad: "Work cross-functionally with stakeholders." Good: "Own the weekly metrics review and turn
it into decisions — not a status update."

### What We're Looking For
Must-haves first (label them clearly). Then nice-to-haves.
Do not list more than 7 total requirements — every additional requirement is a candidate you
will not hear from.

### What You Won't Be Doing
3 bullet points explicitly listing what this role is NOT. This prevents the wrong candidates
from applying and sets expectations for the right ones.

### Compensation and Benefits
Be specific if possible. A salary range outperforms "competitive salary" at attracting good
candidates and filtering out mismatches.

### How to Apply
One specific instruction. Not "send us a CV" — give candidates something to do that shows
you have thought about who you want. Example: "In your first email, include one paragraph
describing a decision you made under uncertainty and what you learned."
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `role_spec` | Long Text | Yes |
| `company_description` | Long Text | No |
| `tone` | Short Text | No |

**Edge:** Lens 1 output → `role_spec`

---

### Lens 3 — Interview Guide Generator

**Purpose:** Build a structured interview guide so every candidate gets the same fair evaluation.

**Template body:**

```
Write a structured interview guide.

Role spec:
[[role_spec]]

Number of interview rounds:
[[rounds]]

Interview format (video / in-person / async / mixed):
[[format]]

Write a complete interview guide:

## Interview Structure Overview
List each round, its purpose, who conducts it, and its length.

## Round-by-Round Question Sets

For each round, write:

### Round [N]: [Title] (e.g. "Intro / Culture", "Technical Deep Dive", "Case Study")
**Purpose:** What this round is designed to reveal.
**Duration:** Suggested time.
**Interviewer:** Which role conducts this round.

**Questions:**
For each question:
- **Q:** [The question]
- **What a strong answer includes:** [2–3 specific signals that indicate a strong response]
- **Follow-up:** [One probing follow-up to go deeper]

Include at least one behavioural question (tell me about a time when...), one hypothetical
question (what would you do if...), and one skills question per round.

For technical roles: include one practical exercise or screen-share question.

## Questions NOT to Ask
List any questions that are illegal or inappropriate to ask in a hiring context in most
jurisdictions (age, family status, nationality, religion, health), and why.

## Candidate Questions to Invite
5 strong questions candidates might ask — and what a thoughtful answer from the company sounds like.
This helps interviewers prepare for the conversation, not just conduct it.
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `role_spec` | Long Text | Yes |
| `rounds` | Short Text | No |
| `format` | Short Text | No |

**Edge:** Lens 1 output → `role_spec`

---

### Lens 4 — Evaluation Rubric Writer

**Purpose:** Create a consistent scoring rubric so that every interviewer evaluates candidates on the same criteria in the same way.

**Template body:**

```
Write a candidate evaluation rubric.

Role spec:
[[role_spec]]

Interview guide:
[[interview_guide]]

Write a structured evaluation rubric:

## Evaluation Dimensions
For each dimension that matters for this role (draw from the role spec's must-haves and
the interview guide's purpose statements), write:

### Dimension: [Name]
**Definition:** One sentence describing what this dimension measures.
**Why it matters for this role:** One sentence.
**Scoring:**

| Score | Label | Description |
|-------|-------|-------------|
| 4 | Exceptional | [Specific behaviours that would earn this score] |
| 3 | Strong | [Specific behaviours] |
| 2 | Adequate | [Specific behaviours] |
| 1 | Weak | [Specific behaviours] |

**Red flag signals:** Responses or behaviours that should trigger serious concern, regardless of score.

Include dimensions for: role-specific skills, problem-solving / judgment, communication,
values fit, and coachability / self-awareness.

## Scoring Sheet
A simple table every interviewer fills out after the interview:

| Dimension | Score (1–4) | Evidence / Notes |
|-----------|-------------|-----------------|

**Total score:** [Sum] / [Max]
**Hire recommendation:** Strong Yes / Yes / No / Strong No
**Key concerns (must address before making a decision):**
**Strengths (most notable positives):**

## Debrief Protocol
How to run the post-interview debrief to minimise groupthink:
1. Every interviewer submits their scorecard independently before the debrief.
2. The hiring manager reads scores out loud before discussion begins.
3. Discuss gaps first — where interviewers disagreed and why.
4. Determine if any concern is a disqualifier vs. a manageable risk.
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `role_spec` | Long Text | Yes |
| `interview_guide` | Long Text | Yes |

**Edges:**
- Lens 1 output → `role_spec`
- Lens 3 output → `interview_guide`

---

### Running Workflow 3

Root inputs:

| Node | Root inputs |
|------|------------|
| Lens 1 | `hiring_need` (required), `company_context`, `budget` |
| Lens 2 | `company_description`, `tone` |
| Lens 3 | `rounds`, `format` |
| Lens 4 | (no additional root inputs) |

---

## Tips for all startup Workflows

**Run the weekly memo every week, even when nothing feels notable.** The pattern is valuable over time: gaps in the "What Shipped" section are visible, decision velocity is trackable, and priority drift becomes obvious when you have a 6-week record.

**Do not launch without going through the checklist manually.** Lens 3 of the Launch Preparation Workflow generates a checklist — but generating it is not the same as completing it. Every item marked 🔴 Must-have needs a named owner and a confirmed done date before you press the launch button.

**Positioning before copy.** If you skip Lens 1 of the Launch Preparation Workflow and go straight to writing landing page copy, the copy will sound generic because it is not built on a differentiated position. The positioning workshop is not optional.

**Job descriptions are public contracts.** The Hiring Pipeline output is a starting point. Have a founder or legal counsel review the final JD for claims you cannot back up (e.g. "best-in-class" without evidence) and for anything that could be construed as discriminatory.

**The rubric only works if everyone uses it independently.** The evaluation rubric from Lens 4 is most valuable when every interviewer submits a scorecard before the group debrief. If you read everyone's notes together first, the first person's opinion anchors everyone else. Use the debrief protocol in the rubric output.

---

*Back to: [Workflow Examples →](./index)*
