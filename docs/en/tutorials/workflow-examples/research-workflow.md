---
title: Research Workflows
description: Three complete Workflow examples for researchers, students, and analysts — literature review, competitive analysis, and interview analysis — with full Lens definitions.
---

# Research Workflows

This page shows three complete Workflows for systematic research work. Each one breaks a messy, open-ended research task into structured, verifiable steps so you can audit the model's reasoning at every stage rather than accepting a single opaque summary.

---

## Workflow 1 — Literature Review Pipeline

**Goal:** Process multiple source documents (papers, articles, reports) and produce a structured literature review: individual summaries, a synthesis of common themes, identification of gaps, and follow-up questions worth investigating.

**Who it is for:** Academic researchers, graduate students, policy analysts, and knowledge workers doing evidence-based work.

> **Note on accuracy:** AI models can misattribute quotes, hallucinate citations, and mischaracterise sources. For each Lens in this Workflow, the output should be treated as a first-pass draft. Cross-check every specific claim, statistic, and citation against the original source before including it in a published document.

### Pipeline overview

```
[1. Source Summarizer]          ← run once per document
        ↓ individual summaries
[2. Synthesis Generator]        ← receives all summaries together
        ↓ themes + contradictions
[3. Gap Analyzer]               ← receives synthesis
        ↓ research gaps + open questions
[4. Literature Review Writer]   ← receives all prior outputs
        ↓ structured review draft (leaf output)
```

> **Multiple documents:** For a literature review with several sources, run Lens 1 multiple times (once per document) and paste all the individual summaries together into Lens 2's `summaries` parameter.

---

### Lens 1 — Source Summarizer

**Purpose:** Summarise one source document faithfully — what it claims, how it argues, and what its limitations are.

**Template body:**

```
You are a research analyst summarising an academic paper, report, or article.

Document content (paste the full text, abstract, or a substantial excerpt):
[[document]]

Document type (journal paper, policy report, news article, book chapter, other):
[[doc_type]]

Research question you are investigating:
[[research_question]]

Produce a structured summary:

## Bibliographic Information
- Authors (as listed in the document):
- Publication venue or source:
- Year:
- DOI or URL (if visible in the text):
If any of this information is not present in the pasted text, write [NOT IN SOURCE] —
do not guess.

## Core Claim
One sentence: the single most important argument or finding of this document.

## Evidence and Methods
How does the document support its core claim? Describe:
- Study type (RCT, survey, case study, meta-analysis, theoretical, etc.)
- Sample size and population (if empirical)
- Key data sources used
- Analytical methods

## Key Findings
3–5 bullet points. Each is a specific, quotable finding — include numbers and comparisons where
the document provides them. Mark any paraphrased finding with [PARAPHRASE] and any direct
quote with quotation marks and a page or section reference.

## Limitations Acknowledged
What does the document itself acknowledge as limitations? List them directly — do not add
limitations the document does not mention.

## Relevance to Research Question
How does this document relate to [[research_question]]? Rate relevance: High / Medium / Low
with a 2-sentence justification.

## Verbatim Excerpt (optional)
If one passage is particularly important, quote it exactly here with a location reference.
```

**Parameters:**

| Label | Type | Required | Help text |
|-------|------|----------|-----------|
| `document` | Long Text | Yes | Paste full text or a substantial excerpt |
| `doc_type` | Short Text | No | e.g. "systematic review", "news article", "policy brief" |
| `research_question` | Long Text | Yes | The question your literature review is answering |

---

### Lens 2 — Synthesis Generator

**Purpose:** Look across multiple individual summaries and identify what they agree on, where they contradict each other, and what patterns emerge.

**Template body:**

```
You are a research analyst synthesising findings across multiple sources.

Individual source summaries:
[[summaries]]

Research question being investigated:
[[research_question]]

Produce a synthesis:

## Areas of Consensus
What do multiple sources agree on? For each consensus point:
- The claim
- Which sources support it (use the bibliographic info from the summaries)
- How strong is the consensus: strong (3+ independent sources), moderate (2 sources), weak (inference)

## Contradictions and Debates
Where do sources disagree? For each contradiction:
- What the disagreement is about
- Which sources take which position
- A hypothesis for why they disagree (different populations, different time periods, different methods,
  conflicting incentives)

## Methodological Patterns
What kinds of evidence dominate this literature? What methods are over- or under-represented?
(e.g. "Most studies are survey-based; no RCTs exist on this topic yet.")

## Strongest Evidence
Which source or finding in the collection has the highest methodological quality and why?

## Most Surprising Finding
One finding from any source that challenges a common assumption — and what the assumption was.

Important: only reference sources that appear in the summaries you were given. Do not introduce
external sources or citations not present in the input.
```

**Parameters:**

| Label | Type | Required | Help text |
|-------|------|----------|-----------|
| `summaries` | Long Text | Yes | Paste all Lens 1 outputs together |
| `research_question` | Long Text | Yes | Same question used in Lens 1 |

---

### Lens 3 — Gap Analyzer

**Purpose:** Identify what the existing literature does not address — which is where the most valuable original research or analysis can happen.

**Template body:**

```
You are a research analyst identifying gaps in an existing body of literature.

Synthesis of existing literature:
[[synthesis]]

Research question:
[[research_question]]

Identify research gaps and open questions:

## Empirical Gaps
Questions that could be answered by collecting data but where no existing study has done so.
For each gap:
- The specific unanswered question
- What kind of study would answer it (RCT, longitudinal survey, case study, etc.)
- Why this matters to the research question

## Methodological Gaps
Limitations in how existing research was conducted that leave important uncertainties. For each:
- The limitation
- How it affects the reliability of current conclusions
- What a better-designed study would look like

## Contextual Gaps
Populations, time periods, geographies, or contexts that are underrepresented in the literature.

## Theoretical Gaps
Concepts or mechanisms that the literature assumes but does not explain — the "black boxes."

## Highest-Priority Follow-Up Questions
Rank the top 5 questions that most need to be answered, given the current state of the literature.
For each: the question and a one-sentence justification for why it is high-priority.

Base all gaps strictly on what is and is not present in the synthesis. Do not invent sources or
assume knowledge beyond what has been provided.
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `synthesis` | Long Text | Yes |
| `research_question` | Long Text | Yes |

**Edge:** Lens 2 output → `synthesis`

---

### Lens 4 — Literature Review Writer

**Purpose:** Assemble the summaries, synthesis, and gap analysis into a structured, academically formatted literature review draft.

**Template body:**

```
Write a structured literature review draft.

Source summaries:
[[summaries]]

Synthesis:
[[synthesis]]

Gap analysis:
[[gaps]]

Research question:
[[research_question]]

Citation style:
[[citation_style]]

Write a literature review with these sections:

## Introduction (150–200 words)
- The research question or topic being reviewed
- Why this question matters
- The scope of the review: what types of sources were included and why
- A brief roadmap of the sections that follow

## Thematic Sections
Organise the literature by theme, not by source. Do not write "Smith (2020) found X. Jones (2021)
found Y." Instead, write about the theme and cite sources as evidence.

For each theme:
- A descriptive subheading
- What the literature shows about this theme
- In-text citations using [[citation_style]] style (e.g. APA: Smith, 2020; Chicago: footnote)
- Where sources agree and where they diverge within this theme

## Methodological Assessment
A paragraph evaluating the overall quality and type of evidence in the literature.

## Gaps and Future Directions
Summarise the gap analysis into 3–5 paragraphs, each covering one type of gap.

## Conclusion (100–150 words)
- What the literature has established with reasonable confidence
- What remains open
- Why these gaps matter for future research or practice

## References
List every source cited, formatted in [[citation_style]] style, using only the bibliographic
information provided in the summaries. Mark any incomplete citations with [VERIFY BEFORE SUBMISSION].

---
⚠️ Draft only. All citations and factual claims must be verified against original sources
before submission or publication.
```

**Parameters:**

| Label | Type | Required | Help text |
|-------|------|----------|-----------|
| `summaries` | Long Text | Yes | — |
| `synthesis` | Long Text | Yes | — |
| `gaps` | Long Text | Yes | — |
| `research_question` | Long Text | Yes | — |
| `citation_style` | Short Text | No | e.g. "APA 7th edition", "Chicago 17th", "Vancouver" |

**Edges:**
- Lens 2 output → `synthesis`
- Lens 3 output → `gaps`

---

### Running Workflow 1

Root inputs:

| Node | Root inputs |
|------|------------|
| Lens 1 (per doc) | `document` (required), `doc_type`, `research_question` |
| Lens 2 | `summaries` (paste all Lens 1 outputs), `research_question` |
| Lens 3 | `research_question` |
| Lens 4 | `summaries`, `research_question`, `citation_style` |

---

## Workflow 2 — Competitive Analysis Pipeline

**Goal:** Process information about competitors and your own product to produce a feature comparison matrix, a positioning gap analysis, and a strategic brief.

**Who it is for:** Product managers, founders, marketing leads, and analysts preparing for a product strategy session or a market positioning decision.

### Pipeline overview

```
[1. Competitor Profile Builder]    ← run once per competitor
        ↓ competitor profiles
[2. Feature Matrix Generator]      ← receives all profiles
        ↓ comparison matrix
[3. Positioning Gap Analyzer]      ← receives matrix + your product
        ↓ positioning gaps + opportunities
[4. Strategic Brief Writer]        ← receives all prior outputs
        ↓ competitive strategy brief (leaf output)
```

---

### Lens 1 — Competitor Profile Builder

**Purpose:** Build a structured profile of one competitor from raw information (website copy, reviews, pricing pages, press releases).

**Template body:**

```
You are a competitive analyst profiling a company.

Raw information about this competitor (paste website text, review excerpts, pricing page,
G2/Trustpilot reviews, press releases, or your own notes):
[[raw_info]]

Competitor name:
[[competitor_name]]

Your product category:
[[category]]

Build a structured competitor profile:

## Overview
- Company name:
- Founded: [year, or "unknown" if not in the source]
- Headquarters: [city/country, or "unknown"]
- Funding / public status: [if known from the source]
- Primary target customer: one sentence describing who they sell to

## Core Product
What does this product do? Describe it in 2–3 sentences as a neutral observer — not as a critic
or a promoter.

## Key Features
List the features most prominently advertised or most frequently mentioned in reviews.
Format: Feature name — one-sentence description.

## Pricing
Describe the pricing model (freemium / subscription tiers / usage-based / per-seat / custom).
List specific prices only if they appear in the raw information. Do not guess.

## Strengths (from evidence in the source)
What do customers or the company itself say are the strongest points? Back each with a
paraphrase or quote from the source.

## Weaknesses (from evidence in the source)
What complaints, limitations, or gaps appear in reviews or competitor comparisons?
Use only evidence from the raw information — do not invent criticisms.

## Messaging and Positioning
How does this company describe itself? Quote 2–3 phrases from their own marketing copy.
What emotion or outcome do they lead with?

If information is missing for any section, write [NOT IN SOURCE] rather than guessing.
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `raw_info` | Long Text | Yes |
| `competitor_name` | Short Text | Yes |
| `category` | Short Text | No |

---

### Lens 2 — Feature Matrix Generator

**Purpose:** Produce a side-by-side comparison of your product and competitors across the features that matter most to buyers.

**Template body:**

```
Build a feature comparison matrix from competitor profiles.

Competitor profiles:
[[competitor_profiles]]

Your product description and feature list:
[[your_product]]

Produce:

## Feature Matrix

Identify the 10–15 features most relevant to a buyer's decision in this category. These should be
drawn from the features mentioned across all profiles — not invented.

Format the matrix as a markdown table:

| Feature | [Your Product] | [Competitor A] | [Competitor B] | [Competitor C] |
|---------|---------------|----------------|----------------|----------------|

Cell values:
- ✅ = Confirmed present (supported by the profile)
- ❌ = Confirmed absent
- ⚠️ = Present but with limitations (note the limitation in parentheses)
- ? = Not mentioned in the profile — unknown

Do not fill any cell with ✅ or ❌ if the information was not in the source. Use ? for unknowns.

## Confidence Notes
List any cells where you had to make an inference rather than read a direct statement.

## Most Differentiated Features
Which 3 features show the clearest differentiation between any two products in the matrix?
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `competitor_profiles` | Long Text | Yes |
| `your_product` | Long Text | Yes |

---

### Lens 3 — Positioning Gap Analyzer

**Purpose:** Identify where competitors are weak, where the market is overcrowded, and where a differentiated position could be built.

**Template body:**

```
Analyse a competitive feature matrix for positioning opportunities.

Feature matrix:
[[matrix]]

Your product's current positioning statement (how you currently describe your product to customers):
[[current_positioning]]

Target customer for your product:
[[target_customer]]

Produce:

## Where the Market is Saturated
Feature areas or messaging angles where all competitors are saying similar things. A new entrant
cannot win here without an overwhelming cost or quality advantage.

## Where You Are Currently Undifferentiated
Features or qualities where your product (as described in the matrix) looks similar to 2+ competitors.
For each, assess: is this a real weakness to fix, or a messaging problem?

## Your Strongest Differentiators
Features or qualities where your product has a clear advantage (✅ where competitors show ❌ or ?).
For each: the differentiator and why it matters to [[target_customer]].

## White Space Opportunities
Feature areas or messaging angles that no competitor prominently claims. These are potential
positioning opportunities — but only if they also matter to the target customer.

## Positioning Hypotheses (3)
Three candidate positioning statements for your product, each exploiting a different gap.
Format: "[Product name] is the only [category] that [differentiating claim] for [target customer]."
Rate each hypothesis: Strong / Moderate / Risky — with one sentence of reasoning.
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `matrix` | Long Text | Yes |
| `current_positioning` | Long Text | No |
| `target_customer` | Short Text | No |

**Edge:** Lens 2 output → `matrix`

---

### Lens 4 — Strategic Brief Writer

**Purpose:** Distil all the competitive analysis into an actionable, decision-ready strategic brief.

**Template body:**

```
Write a competitive strategy brief for a product team.

Feature matrix:
[[matrix]]

Positioning gap analysis:
[[gap_analysis]]

Decision context (what decision or planning session this brief is for):
[[decision_context]]

Write a concise competitive strategy brief:

---
# Competitive Analysis Brief
*Prepared from: [describe sources used]*
*Date: [TODAY]*

## Executive Summary (5 bullets)
The five most important findings from the competitive analysis. Each bullet: one sentence, past
tense, specific and evidence-based.

## Competitive Landscape Overview
A 2-paragraph description of how this market is structured: who the dominant players are, how
they are differentiated, and where the competitive intensity is highest.

## Feature Gaps (Priority Order)
The top 5 feature gaps — areas where your product is behind key competitors. For each:
- The gap and which competitor has it
- Customer impact: does this gap cause lost deals? (Rate: High / Medium / Low)
- Effort to close: (Estimate: Low / Medium / High)

## Positioning Recommendations
The strongest positioning hypothesis from the gap analysis, and 2 backup options.
For the primary recommendation: why this angle, who it resonates with, and what message to test.

## Proposed Next Steps
3–5 concrete actions with owners and timelines (use placeholders if owners are unknown).

---
*This brief is based on publicly available information and internal notes. Competitor data
should be re-verified before use in board presentations or fundraising materials.*
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `matrix` | Long Text | Yes |
| `gap_analysis` | Long Text | Yes |
| `decision_context` | Long Text | No |

**Edges:**
- Lens 2 output → `matrix`
- Lens 3 output → `gap_analysis`

---

## Workflow 3 — Interview and Survey Analysis Pipeline

**Goal:** Process raw interview transcripts or survey responses and extract structured insights: key themes, representative quotes, action items, and a research findings brief.

**Who it is for:** UX researchers, product managers, customer success teams, and anyone doing qualitative research on user or customer behaviour.

### Pipeline overview

```
[1. Response Structurer]       ← run once per interview/response batch
        ↓ structured data
[2. Theme Extractor]           ← receives all structured data
        ↓ themes + supporting quotes
[3. Insight Synthesizer]       ← receives themes
        ↓ prioritised insights
[4. Research Findings Writer]  ← receives all prior outputs
        ↓ findings brief (leaf output)
```

---

### Lens 1 — Response Structurer

**Purpose:** Take a messy interview transcript or survey dump and extract clean, structured data points.

**Template body:**

```
You are a qualitative researcher processing raw interview or survey data.

Raw transcript or survey responses:
[[raw_data]]

Research goals (what questions is this research trying to answer):
[[research_goals]]

Data type:
[[data_type]]

Structure the raw data:

## Participant Overview
- Data type: [[data_type]]
- Number of respondents / interview sessions:
- Any demographic or role information visible in the data:

## Stated Problems and Pain Points
List every pain point mentioned — verbatim quotes where possible, paraphrase where the statement
is too long. Format: "[Quote or paraphrase]" — [participant identifier if available]

## Stated Goals and Desired Outcomes
What do participants say they are trying to achieve?

## Current Solutions / Workarounds
What are participants currently doing to solve the problem? Include tools, processes, manual steps.

## Reactions to Concepts (if concept testing was done)
What did participants say about any specific ideas, features, or prototypes shown to them?

## Surprising or Unexpected Statements
Any response that contradicted a common assumption or that seemed unusual.

## Questions Left Open
Anything participants asked about or expressed confusion around that the research did not resolve.

Important: do not interpret or editorialize in this section. Only extract what participants said.
Interpretation happens in later steps.
```

**Parameters:**

| Label | Type | Required | Help text |
|-------|------|----------|-----------|
| `raw_data` | Long Text | Yes | Paste transcript or survey responses |
| `research_goals` | Long Text | Yes | The questions this research was designed to answer |
| `data_type` | Short Text | No | e.g. "1-hour user interviews (5 participants)" or "open-text survey (34 responses)" |

---

### Lens 2 — Theme Extractor

**Purpose:** Identify the themes that appear across multiple responses — what multiple participants said, not just one.

**Template body:**

```
Extract themes from structured qualitative research data.

Structured research data:
[[structured_data]]

Identify themes — patterns that appear in responses from multiple participants. A single
participant mentioning something is an observation, not a theme.

For each theme:

### Theme [N]: [Descriptive name]
**Frequency:** How many participants or responses mentioned this? (e.g. "4 of 5 participants")
**Definition:** One sentence describing what this theme captures.
**Supporting quotes:** 2–4 direct quotes or close paraphrases that illustrate the theme.
  Include participant identifiers where available.
**Emotional valence:** Is this theme associated with frustration, excitement, confusion, resignation,
  delight? What emotion do participants express when this topic comes up?
**Connection to other themes:** Does this theme reinforce or contradict another theme?

After listing all themes, produce:

## Theme Priority Matrix
| Theme | Frequency | Intensity | Relevance to Research Goals | Priority |
|-------|-----------|-----------|----------------------------|----------|

Priority: High / Medium / Low — based on the combination of frequency, emotional intensity,
and how directly it addresses the research goals.
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `structured_data` | Long Text | Yes |

**Edge:** Lens 1 output → `structured_data`

---

### Lens 3 — Insight Synthesizer

**Purpose:** Move from themes (what people said) to insights (what it means for product, service, or strategy).

**Template body:**

```
Synthesise qualitative research themes into actionable insights.

Research themes:
[[themes]]

Research goals:
[[research_goals]]

Team context (who will use these insights — product, design, marketing, leadership):
[[audience]]

An insight is not a restatement of a theme. It is an interpretation: what the theme implies
about user behaviour, mental models, needs, or opportunities.

For each high-priority theme, write an insight:

### Insight [N]
**Theme it comes from:** [Theme name]
**Insight statement:** "Users [do/think/feel X] because [underlying reason Y],
  which means [implication for product/team Z]."
**Confidence:** High (strong evidence across many responses) / Medium / Low (interesting but weak evidence)
**Implications:** 2–3 specific things this insight suggests the team should do, consider, or test
**What would disprove this:** What evidence would suggest this insight is wrong?

After all insights, list:

## Insights Not Yet Actionable
Observations that are interesting but for which there is not yet enough evidence to act.
Note what additional data would be needed to make them actionable.
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `themes` | Long Text | Yes |
| `research_goals` | Long Text | Yes |
| `audience` | Short Text | No |

**Edge:** Lens 2 output → `themes`

---

### Lens 4 — Research Findings Writer

**Purpose:** Combine all analysis into a research brief that decision-makers can read in 10 minutes.

**Template body:**

```
Write a qualitative research findings brief.

Structured data:
[[structured_data]]

Themes:
[[themes]]

Insights:
[[insights]]

Audience for this brief:
[[audience]]

Research goals this brief addresses:
[[research_goals]]

Write a research findings brief:

---
# Research Findings Brief

## Research Overview
- **Goals:** What questions this research was designed to answer
- **Method:** Data type, number of participants, how data was collected
- **Date conducted:** [Leave blank — to be filled by researcher]

## Top 3 Findings
The three insights that have the strongest evidence and the most direct implication for decisions.
Each finding: one sentence statement, one supporting quote, one concrete implication.

## Full Findings
All insights from the synthesis, in priority order. For each:
- Insight statement
- Evidence (frequency + representative quote)
- Implications for the team

## What We Did Not Learn
Gaps in the research — questions the data could not answer. What would need to happen next
to close these gaps?

## Recommended Actions
A numbered list of concrete next steps, with a suggested owner role and urgency level.

## Appendix: Representative Quotes
A curated selection of the most important verbatim quotes from the research, organised by theme.

---
*This brief represents qualitative findings from a limited sample. Findings are directional and
should be validated with additional research before major product or investment decisions.*
```

**Parameters:**

| Label | Type | Required |
|-------|------|----------|
| `structured_data` | Long Text | Yes |
| `themes` | Long Text | Yes |
| `insights` | Long Text | Yes |
| `audience` | Short Text | No |
| `research_goals` | Long Text | Yes |

**Edges:**
- Lens 1 output → `structured_data`
- Lens 2 output → `themes`
- Lens 3 output → `insights`

---

## Tips for all research Workflows

**Process each document or interview separately.** Run Lens 1 once per source, then combine all the outputs in Lens 2. Mixing all sources into a single Lens 1 run causes the model to blend and lose attribution.

**Never trust citations without checking.** AI models hallucinate references. Every citation produced by Lens 4 in Workflow 1 must be checked against the original source. The prompt includes a [VERIFY BEFORE SUBMISSION] flag for incomplete citations — take it seriously.

**Quotes need source verification too.** Even when the model quotes directly from your pasted text, it can introduce small changes. Check every quoted passage against the original before using it in a publication.

**Use the confidence ratings.** Lens 3 rates each insight as High / Medium / Low confidence. Treat Low-confidence insights as hypotheses to test, not conclusions to act on.

**The synthesis is not the final word.** These Workflows accelerate analysis — they do not replace a researcher's judgment. The model will miss context, cultural nuance, and non-verbal cues that a skilled researcher would catch in an interview. Use the output as a structured starting point for your own synthesis.

---

*Next: [Startup Workflows →](./startup-workflow)*
