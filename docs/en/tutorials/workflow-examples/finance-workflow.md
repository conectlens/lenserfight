---
title: Finance Workflows
description: Three complete Workflow examples for founders and operators — weekly KPI review, investor update, and budget analysis. Informational only; not financial advice.
---

# Finance Workflows

> **⚠️ Informational only — not financial advice.**
> These Workflows help you structure thinking, explain numbers in plain language, and draft documents for internal use. They do not constitute financial, investment, tax, accounting, or legal advice. Always verify AI-generated financial output with a qualified professional before making decisions or sharing with external parties.

Three pipelines for founders, operators, and analysts who need to turn raw numbers into structured narratives quickly.

---

## Workflow 1 — Weekly Business KPI Review

**Goal:** Turn a raw dump of weekly metrics into a management memo: plain-English explanations of what the numbers mean, which trends are concerning, and what decisions need to be made.

**Who it is for:** Founders, heads of product, and operators running a weekly business review. Especially useful before a team meeting where you need to present the week's performance clearly.

### Pipeline overview

```
[1. Metrics Ingestion]
        ↓ structured metric snapshot
[2. Trend Analyzer]
        ↓ trend analysis + alerts
[3. Plain-Language Explainer]
        ↓ non-technical explanation
[4. Management Memo Writer]
        ↓ weekly review memo (leaf output)
```

---

### Lens 1 — Metrics Ingestion

**Purpose:** Take raw, messy metric data and convert it into a clean, structured snapshot that every downstream step can work from reliably.

**Template body:**

```
You are a data analyst preparing a metrics snapshot for a weekly business review.

Raw metrics data (paste your dashboard export, spreadsheet rows, or written notes):
[[raw_metrics]]

Business context (what the company does, stage, primary revenue model):
[[business_context]]

Reporting period:
[[period]]

Clean and structure the data into a metrics snapshot:

## Metric Snapshot — [[period]]

For each metric found in the raw data, produce a table row:

| Metric | This Period | Prior Period | Change (%) | Target | Status |
|--------|-------------|--------------|------------|--------|--------|

Status values: ✅ On track / ⚠️ Watch / 🔴 Off track / — No target set

Group metrics into categories:
- Growth (users, signups, revenue, MRR/ARR)
- Engagement (DAU/MAU, session length, retention)
- Operations (support tickets, error rates, uptime)
- Finance (burn rate, runway, gross margin, CAC, LTV)

If a metric cannot be calculated from the raw data, mark it as [DATA MISSING] rather than
estimating. Do not fabricate values.

After the table, note any data quality issues (inconsistent date ranges, mismatched units,
obviously incorrect values).

> Informational summary only. Not financial advice.
```

**Parameters:**

| Label | Type | Required | Help text |
|-------|------|----------|-----------|
| `raw_metrics` | Long Text | Yes | Paste dashboard data, CSV export, or hand-typed numbers |
| `business_context` | Long Text | No | e.g. "B2B SaaS, 2 years old, subscription revenue, 40 paying customers" |
| `period` | Short Text | No | e.g. "Week ending 2026-05-16" |

---

### Lens 2 — Trend Analyzer

**Purpose:** Look at the structured snapshot and identify trends, anomalies, and risks — not what the numbers are, but what they mean.

**Template body:**

```
You are a business analyst identifying trends in a weekly metrics snapshot.

Metrics snapshot:
[[metrics_snapshot]]

Historical context (optional — prior 4-week averages or known seasonality):
[[historical_context]]

Produce a trend analysis:

## Green Flags
Metrics that are performing above target or showing a positive trend. For each:
- Metric name and value
- Why it is a green flag (not just "it went up" — explain the business implication)

## Yellow Flags
Metrics in the Watch zone. For each:
- Metric name, value, and the threshold that makes it a watch item
- The leading indicator: if this continues, what happens in 2–4 weeks?
- One question the team should answer this week to understand whether to be concerned

## Red Flags
Metrics that are off track or show a concerning trend. For each:
- Metric name, value, and what target it is missing
- Probable cause (based on the data, not speculation beyond the data)
- Impact: what downstream metric does this affect?
- Urgency: needs same-day attention / this-week attention / next-cycle attention

## Anomalies
Any sudden spikes, drops, or data inconsistencies that need explanation before the memo goes out.

## Most Important Metric This Week
Identify the single metric that deserves the most attention and explain why.

> This analysis is for informational and planning purposes only. Not financial advice.
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `metrics_snapshot` | Long Text | Yes |
| `historical_context` | Long Text | No |

**Edge:** Lens 1 output → `metrics_snapshot`

---

### Lens 3 — Plain-Language Explainer

**Purpose:** Translate the trend analysis into language that non-analysts in the team (engineering, design, support) can understand and act on.

**Template body:**

```
Explain a business metrics trend analysis in plain, jargon-free language.

Trend analysis:
[[trend_analysis]]

Target audience for this explanation:
[[audience]]

Rewrite the trend analysis so that someone without a finance or analytics background can
understand it immediately. Rules:

1. Replace every acronym with its full term on first use (MRR = Monthly Recurring Revenue, etc.)
2. Replace percentage changes with real-world analogies where helpful:
   "Churn went up 2%" → "We lost 2 more customers per 100 this week than last week."
3. For every metric, answer: "So what does this actually mean for us?"
4. Use the simplest word that is still precise: "decreased" not "underwent a downward trajectory"
5. No hedging phrases like "it could be argued that." Be direct.
6. Keep each metric explanation to 2–3 sentences maximum.

End with a "What This Means for the Team" section: 3 bullet points, each stating one concrete
thing a non-finance team member can do differently based on this data.

> Informational only. Not financial advice.
```

**Parameters:**

| Label | Type | Required | Help text |
|-------|------|----------|-----------|
| `trend_analysis` | Long Text | Yes | — |
| `audience` | Short Text | No | e.g. "engineering team, no finance background" |

**Edge:** Lens 2 output → `trend_analysis`

---

### Lens 4 — Management Memo Writer

**Purpose:** Combine the snapshot, analysis, and plain-language explanation into a structured weekly memo ready to share with leadership or the team.

**Template body:**

```
Write a weekly management memo from a metrics review.

Metrics snapshot:
[[snapshot]]

Trend analysis:
[[analysis]]

Plain-language explanation:
[[plain_explanation]]

Decisions that need to be made this week (optional):
[[pending_decisions]]

Write a management memo with this structure:

---
# Weekly Business Review — [PERIOD]
*Prepared for informational use. Not financial advice. Verify with your finance team.*

## TL;DR (3 bullets)
The three most important things the leadership team needs to know this week. Each bullet: one
sentence, past tense, no jargon.

## Headline Metrics
Reproduce the metrics snapshot table. Flag status visually with ✅ ⚠️ 🔴.

## What's Working
2–3 paragraphs on green-flag metrics. For each: the metric, the trend, and the business implication.

## What Needs Attention
2–3 paragraphs on yellow and red flags. For each: the metric, why it matters, and what the team
is already doing or should do this week.

## Decisions Required
If [[pending_decisions]] is provided, format each as:
**Decision:** [What needs to be decided]
**By when:** [Date]
**Who decides:** [Role or name]
**Options:** [Brief option A / option B]

## Next Week's Focus
One sentence: the single most important outcome the team should drive next week.

---
*This memo is for internal planning purposes only. All figures are preliminary and should be
reviewed by a qualified finance professional before use in investor or regulatory contexts.*
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `snapshot` | Long Text | Yes |
| `analysis` | Long Text | Yes |
| `plain_explanation` | Long Text | No |
| `pending_decisions` | Long Text | No |

**Edges:**
- Lens 1 output → `snapshot`
- Lens 2 output → `analysis`
- Lens 3 output → `plain_explanation`

---

### Running Workflow 1

Root inputs:

| Node | Root inputs |
|------|------------|
| Lens 1 | `raw_metrics` (required), `business_context`, `period` |
| Lens 2 | `historical_context` |
| Lens 3 | `audience` |
| Lens 4 | `pending_decisions` |

---

## Workflow 2 — Investor Update Draft

**Goal:** Turn your key metrics and company narrative into a structured investor update email — the kind that keeps investors informed, builds trust, and reduces the number of ad-hoc check-in calls.

> **⚠️ Important:** AI-generated investor updates must be reviewed by your CEO, finance lead, or legal counsel before sending. Financial figures must be verified against your source-of-truth accounting system. Do not share forward-looking projections without appropriate disclaimers required by your jurisdiction.

**Who it is for:** Founders at seed through Series B who send monthly or quarterly investor updates.

### Pipeline overview

```
[1. Metrics and Narrative Collector]
        ↓ structured update inputs
[2. Highlights and Lowlights Analyzer]
        ↓ honest narrative
[3. Investor Update Draft Writer]
        ↓ full email draft (leaf output)
```

---

### Lens 1 — Metrics and Narrative Collector

**Template body:**

```
You are a startup founder preparing for an investor update. Structure your raw inputs so they
are ready for a clear, honest narrative.

Raw metrics and notes for this period:
[[raw_inputs]]

Reporting period (e.g. Q1 2026, April 2026):
[[period]]

Company stage and last round:
[[stage]]

Organise the inputs into these categories:

## Key Metrics (this period vs. prior period)
| Metric | Value | Prior Period | Change |
|--------|-------|--------------|--------|

Flag any metric as [NEEDS VERIFICATION] if the value seems inconsistent with others or might
have a data quality issue. Never round numbers to hide bad performance.

## Narrative Notes
Summarise the key events, decisions, and learnings from the period in bullet points —
one bullet per significant item. Include both positives and negatives.

## Help Wanted
What specific help does the company need from investors or their networks right now?
(Introductions, recruiting, specific expertise, references)

> For internal use only. Not financial advice. Verify all figures before external distribution.
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `raw_inputs` | Long Text | Yes |
| `period` | Short Text | No |
| `stage` | Short Text | No |

---

### Lens 2 — Highlights and Lowlights Analyzer

**Template body:**

```
Analyse the structured inputs for an investor update and produce an honest highlights and
lowlights narrative.

Structured inputs:
[[structured_inputs]]

Investors want three things from an update: honest assessment of progress, evidence you know
what is not working, and confidence that leadership understands the path forward.

Write:

## Highlights (2–4 items)
For each highlight:
- What happened (the fact)
- Why it matters for the business (the implication)
- What it signals about the next quarter (the forward-looking insight)

Do not spin neutral results as highlights. If no metric moved materially, do not invent highlights.

## Lowlights (2–3 items)
For each lowlight:
- What did not go as planned
- The honest reason why (do not deflect — investors can tell)
- What you are doing about it
- How you will know if the fix is working

Being honest about lowlights is the single most effective trust-building behaviour in investor
communication. Founders who only share good news lose credibility when bad news arrives.

## Key Decisions Made This Period
2–3 significant decisions and the reasoning behind each.

> This analysis is for internal planning and investor communication drafting. Not financial advice.
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `structured_inputs` | Long Text | Yes |

**Edge:** Lens 1 output → `structured_inputs`

---

### Lens 3 — Investor Update Draft Writer

**Template body:**

```
Write a founder investor update email.

Highlights and lowlights narrative:
[[narrative]]

Metrics table:
[[metrics]]

Help wanted:
[[help_wanted]]

Founder name and company name:
[[founder_info]]

Write a complete investor update email. Format and tone guidance:

**Tone:** Direct, honest, and confident. Not defensive, not overly promotional. Write as if
you are talking to a trusted advisor who has seen many companies succeed and fail.

**Length:** 400–600 words in the body. Investors are busy. Every sentence must earn its place.

**Format:**

Subject: [Company Name] Update — [Period] | [One-sentence headline]

Hi [Investor first names or "team"],

**TL;DR**
3 bullets. One positive, one honest challenge, one ask. Each under 20 words.

**Progress**
2–3 short paragraphs on highlights. Use the highlights narrative. Start with the most important.

**Challenges**
1–2 honest paragraphs on lowlights. Do not bury this section or make it shorter than Highlights.
Investors respect founders who name problems clearly.

**Metrics**
Paste the metrics table here. Add a one-sentence interpretation after each major metric cluster.

**Ask**
Specific and actionable. "I'm looking for an introduction to the head of engineering at [Type of Company]"
is good. "Any help would be appreciated" is not.

**Next quarter priorities**
3 numbered items — the three most important things the company will focus on.

Best,
[Founder name]

---
*This update contains forward-looking statements and preliminary financial figures. All data is
unaudited. Not financial advice. Recipients should conduct their own due diligence.*
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `narrative` | Long Text | Yes |
| `metrics` | Long Text | Yes |
| `help_wanted` | Long Text | No |
| `founder_info` | Short Text | No |

**Edges:**
- Lens 2 output → `narrative`
- Lens 1 output → `metrics`

---

## Workflow 3 — Budget Category Review

**Goal:** Analyse a period's spend by category, identify anomalies and inefficiencies, and produce an actionable review memo for the leadership team.

> **⚠️ Disclaimer:** This Workflow produces informational analysis to support internal discussion. It does not constitute financial, accounting, or tax advice. Budget decisions should involve your finance lead, CFO, or a qualified accountant. Do not use this output in external financial reporting, audits, or regulatory filings.

**Who it is for:** Founders, operations leads, and finance team members doing an internal monthly or quarterly spend review — not external reporting.

### Pipeline overview

```
[1. Spend Data Structurer]
        ↓ categorised spend table
[2. Anomaly and Efficiency Analyzer]
        ↓ findings with supporting evidence
[3. Budget Review Memo Writer]
        ↓ internal review memo (leaf output)
```

---

### Lens 1 — Spend Data Structurer

**Template body:**

```
You are a finance analyst preparing a budget review. Structure raw spend data for analysis.

Raw spend data (bank export, expense report, or manually typed spend):
[[raw_spend]]

Company size and context:
[[context]]

Reporting period:
[[period]]

Organise the spend data:

## Spend by Category

| Category | This Period ($) | Prior Period ($) | Change (%) | % of Total Spend |
|----------|----------------|-----------------|------------|-----------------|

Standard categories (map transactions to the nearest match):
- Payroll and contractors
- Software and SaaS tools
- Infrastructure and cloud hosting
- Marketing and advertising
- Sales and business development
- Travel and accommodation
- Office and facilities
- Professional services (legal, accounting, consulting)
- Hardware and equipment
- Miscellaneous / unclassified

## Data Quality Notes
List any transactions you could not confidently categorise. Mark them [UNCLASSIFIED — REVIEW].
Do not guess categories for ambiguous line items.

## Total Spend
- Total this period: $[X]
- Total prior period: $[X]
- Period-over-period change: [X]%

> Informational only. Not financial advice. Verify all figures against your accounting system.
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `raw_spend` | Long Text | Yes |
| `context` | Short Text | No |
| `period` | Short Text | No |

---

### Lens 2 — Anomaly and Efficiency Analyzer

**Template body:**

```
Analyse a categorised spend table for anomalies and efficiency opportunities.

Spend table:
[[spend_table]]

Business context and recent decisions (e.g. hired 3 engineers last month, ran a paid campaign):
[[context]]

Produce:

## Spend Anomalies
Items where the change from prior period is unexpectedly large (positive or negative) or where
the category seems disproportionate to the company stage. For each:
- Category and the unexpected change
- A possible explanation (based only on the data and context provided)
- The question to ask internally to confirm or deny the explanation

## Potential Efficiency Opportunities
Categories or line items where spend could be reduced, renegotiated, or eliminated without
harming operations. For each:
- What the opportunity is
- Estimated potential saving (express as a range, not a precise figure)
- Risk of acting on it (low / medium / high — and why)

## Spend Well Allocated
Categories where the spend level is appropriate for the company's stage and goals. Be specific
about why — not just "marketing looks fine."

## Unresolved Items
List any [UNCLASSIFIED] transactions from the spend table that need human review before the
analysis is complete.

> This analysis is for internal planning purposes only. Not financial or accounting advice.
> All figures are preliminary and must be verified before use in any external reporting.
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `spend_table` | Long Text | Yes |
| `context` | Long Text | No |

**Edge:** Lens 1 output → `spend_table`

---

### Lens 3 — Budget Review Memo Writer

**Template body:**

```
Write an internal budget review memo.

Spend analysis:
[[analysis]]

Spend table:
[[spend_table]]

Decisions or changes being considered:
[[pending_decisions]]

Write a short, actionable internal memo:

---
# Budget Review — [PERIOD]
*Internal use only. Not financial advice. All figures are unaudited and preliminary.*
*Review with your finance lead before any decisions are finalised.*

## Executive Summary (3 bullets)
The three most important things leadership should know about this period's spend.

## Spend Overview
Reproduce the categorised spend table. Add a one-sentence interpretation for each category
that moved more than 10% period-over-period.

## Key Findings
Combine the anomalies and efficiency opportunities from the analysis into a prioritised list.
Format: Finding → Implication → Recommended next step.

## Items Requiring Decisions
If [[pending_decisions]] is provided, format each as a decision card:
**Decision:** What needs to be decided
**Impact:** Which budget category and estimated amount
**Recommended by:** [This analysis] or [Finance lead to confirm]
**Timeline:** When a decision is needed

## Unresolved Items
List any transactions that need manual review before the memo is considered final.

---
*This memo is for internal planning only. Consult a qualified accountant or CFO before using
this analysis in board reporting, fundraising materials, or external communications.*
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `analysis` | Long Text | Yes |
| `spend_table` | Long Text | Yes |
| `pending_decisions` | Long Text | No |

**Edges:**
- Lens 2 output → `analysis`
- Lens 1 output → `spend_table`

---

### Running Workflow 3

Root inputs:

| Node | Root inputs |
|------|------------|
| Lens 1 | `raw_spend` (required), `context`, `period` |
| Lens 2 | `context` (optional additional context) |
| Lens 3 | `pending_decisions` |

---

## Important notes for all finance Workflows

**Always verify numbers against your accounting system.** AI models can misread tables, transpose digits, and calculate percentages incorrectly. Every number in the output should be spot-checked before the memo leaves your drafts folder.

**Add the disclaimer to every deliverable.** Each Lens in these Workflows includes an informational disclaimer in the prompt. Do not remove it when editing the output. If you share the memo with others, the disclaimer must remain visible.

**These Workflows are not a substitute for a finance team.** They are useful for preparing for a conversation with your finance lead, structuring a first draft, or explaining numbers to non-finance teammates. They are not a replacement for professional accounting, audit, tax, or investment advice.

**What these Workflows will not do:**
- Give investment recommendations or portfolio advice
- Prepare tax filings or provide tax guidance
- Produce audited financial statements
- Offer legal or regulatory compliance advice
- Replace a CFO, CPA, or financial advisor

---

*Next: [Research Workflows →](./research-workflow)*
