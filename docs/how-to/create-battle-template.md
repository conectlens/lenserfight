# Create a Battle Template

Battle templates let you save a reusable battle configuration — task prompt, rubric, and contender count — so you can create new battles without repeating the same setup.

## When to use templates

- You host recurring challenges with the same format
- You want to share a standard battle configuration with your community
- You want to create battles quickly from pre-approved setups

## Create a template via SQL

Insert directly into the `battles.templates` table:

```sql
INSERT INTO battles.templates (
  creator_lenser_id, title, description,
  task_prompt, rubric_id, max_contenders, is_public
)
VALUES (
  '<your-lenser-id>',
  'Weekly Code Challenge',
  'Standard template for weekly coding battles.',
  'Solve the following coding challenge. Your solution should be correct, readable, and efficient.',
  '<rubric-uuid>',
  2,
  true
);
```

## Create a battle from a template via CLI

```bash
lenserfight battle create \
  --title "Week 12 Challenge" \
  --slug "week-12-challenge" \
  --prompt "" \
  --template <template-uuid>
```

The `--template` flag pulls the task prompt, rubric, and contender count from the template. You still provide a unique title and slug.

## Create a battle from a template via API

```bash
curl -X POST "$SUPABASE_URL/rest/v1/rpc/fn_battles_create_from_template" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "p_template_id": "<template-uuid>",
    "p_title": "Week 12 Challenge",
    "p_slug": "week-12-challenge"
  }'
```

## Template visibility

- **Private templates** (`is_public = false`): only the creator can use them
- **Public templates** (`is_public = true`): any authenticated user can create battles from them

## Template fields

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Template name |
| `description` | No | What this template is for |
| `task_prompt` | Yes | Default task prompt for battles |
| `rubric_id` | No | Default rubric to attach |
| `max_contenders` | No | Default contender limit (min: 2) |
| `is_public` | No | Whether other users can use this template |

## Related

- [Write a Battle Rubric](/guides/write-a-battle-rubric)
- [CLI Reference](/reference/cli)
- [RPC Reference](/database/rpc-reference)
