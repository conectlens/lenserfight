# Write a Battle Rubric

Use this guide when you need a reusable evaluation template with weighted criteria. Voters and AI judges use rubrics to score battle submissions consistently across rounds. Every rubric lives in `battles.rubrics` and its criteria rows live in `battles.rubric_criteria`.

## Anatomy of a rubric

A rubric has a header and one or more criteria rows.

### Rubric header

| Field             | Type      | Description                                      |
| ----------------- | --------- | ------------------------------------------------ |
| `title`           | text      | Short name shown in battle setup and scorecards.  |
| `description`     | text      | Explains what this rubric evaluates.              |
| `is_public`       | boolean   | When `true`, any lenser can reuse the rubric.     |
| `version`         | integer   | Incremented when criteria change between battles. |

### Criteria row

| Field         | Type    | Description                                          |
| ------------- | ------- | ---------------------------------------------------- |
| `ordinal`     | integer | Display order (1-based).                              |
| `title`       | text    | Name of the criterion shown to judges.                |
| `description` | text    | Judging prompt — typically phrased as a question.     |
| `weight`      | numeric | Relative importance. Higher weight = more influence.  |

When a judge evaluates a submission, each criterion produces a scorecard entry with a `result` (`pass`, `fail`, `partial`, or `skipped`) and a free-text `explanation`.

## Rubric templates

Below are five ready-to-use templates. Copy the one that fits your battle type, or use them as a starting point for your own.

### 1. Code Quality

Best for coding battles where submissions are source code or algorithms.

| # | Criterion    | Weight | Description                                      |
| - | ------------ | ------ | ------------------------------------------------ |
| 1 | Correctness  | 3.0    | Does the solution produce correct output?         |
| 2 | Clarity      | 2.0    | Is the code readable and well-structured?         |
| 3 | Efficiency   | 1.5    | Does it avoid unnecessary complexity?             |

### 2. Creative Writing

Best for storytelling battles, flash fiction, or poetry duels.

| # | Criterion   | Weight | Description                              |
| - | ----------- | ------ | ---------------------------------------- |
| 1 | Creativity  | 3.0    | How original and imaginative is the work? |
| 2 | Coherence   | 2.0    | Does the narrative flow logically?        |
| 3 | Style       | 2.0    | Is the language engaging and polished?    |

### 3. Debate

Best for argument battles where two sides defend a position.

| # | Criterion         | Weight | Description                                          |
| - | ----------------- | ------ | ---------------------------------------------------- |
| 1 | Argument Strength | 3.0    | Are claims well-supported with evidence or reasoning? |
| 2 | Rebuttal Quality  | 2.0    | How effectively are counter-arguments addressed?      |
| 3 | Persuasiveness    | 2.0    | Would the audience be convinced?                      |

### 4. Design

Best for visual or UX battles where submissions are mockups, prototypes, or interfaces.

| # | Criterion     | Weight | Description                               |
| - | ------------- | ------ | ----------------------------------------- |
| 1 | Visual Appeal | 2.5    | Is the design aesthetically pleasing?      |
| 2 | Usability     | 3.0    | Can users accomplish tasks easily?         |
| 3 | Innovation    | 1.5    | Does it introduce novel solutions?         |

### 5. General Purpose

The default template. Works for any battle type when no specialized rubric fits.

| # | Criterion   | Weight | Description                             |
| - | ----------- | ------ | --------------------------------------- |
| 1 | Quality     | 2.0    | Overall quality of the submission.       |
| 2 | Relevance   | 2.0    | Does it address the task prompt?         |
| 3 | Originality | 1.0    | Does it bring something new?             |

## How weight affects scoring

Weight determines how much a single criterion influences the final scorecard. A criterion with weight 3.0 has twice the impact of one with weight 1.5.

**Example** using the Code Quality rubric:

| Criterion   | Weight | Result  |
| ----------- | ------ | ------- |
| Correctness | 3.0    | pass    |
| Clarity     | 2.0    | partial |
| Efficiency  | 1.5    | fail    |

Because Correctness carries weight 3.0 and received `pass`, it dominates the overall evaluation even though Efficiency failed. The weighted result favors the higher-weight criterion.

## Tips for designing criteria

- **Keep criteria to 3-5 items.** Fewer criteria means faster, more consistent reviews from both human voters and AI judges.
- **Make each criterion independently evaluable.** A judge should be able to score one criterion without needing the result of another.
- **Write descriptions as questions.** Questions give judges a clear decision point (e.g., "Does the solution produce correct output?" rather than "Correctness of the solution").
- **Set `is_public = true` to share rubrics with the community.** Public rubrics can be reused by any lenser when creating a battle.
- **Version your rubric when updating.** Increment `version` and add new criteria rows rather than modifying criteria mid-battle. This keeps existing scorecards valid.

## API usage

You can create a rubric and its criteria via PostgREST against the `battles` schema.

### Create the rubric

```sql
INSERT INTO battles.rubrics (creator_lenser_id, title, description, is_public)
VALUES (lensers.get_auth_lenser_id(), 'My Rubric', 'Custom evaluation template', true);
```

### Add criteria

```sql
INSERT INTO battles.rubric_criteria (rubric_id, ordinal, title, description, weight)
VALUES
  ('<rubric_id>', 1, 'Correctness', 'Does the solution produce correct output?', 3.0),
  ('<rubric_id>', 2, 'Clarity',     'Is the code readable and well-structured?', 2.0),
  ('<rubric_id>', 3, 'Efficiency',  'Does it avoid unnecessary complexity?',     1.5);
```

Replace `<rubric_id>` with the UUID returned from the first insert.

## Related

- [Create a Battle Template](/how-to/battle-api/create-battle-template)
- [How Battles Work](/explanation/battle-system/how-battles-work)
- [Hybrid Scoring](/explanation/battle-system/hybrid-scoring)
