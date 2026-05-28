-- Phase AK demo seed — idempotent insert of the image-generation-demo workflow.
-- Owned by seeded Alice (lensers.profiles id b2000000-…-0001).

INSERT INTO lenses.workflows (id, lenser_id, title, description, visibility)
VALUES (
  'd10adea1-1eee-4eee-aeee-000000000ak1',
  'b2000000-0000-0000-0000-000000000001',
  'Image Generation Demo',
  'Phase AK foundation demo — single-node fal-ai/flux/dev image generation.',
  'public'
)
ON CONFLICT (id) DO UPDATE
  SET title       = EXCLUDED.title,
      description = EXCLUDED.description,
      visibility  = EXCLUDED.visibility;

-- Note: workflow node/edge schema lives in lenses.workflow_nodes (or similar);
-- on local dev we recommend opening the workflow in the web builder once and
-- saving — that wires the fal-ai/flux/dev node consistently with the current
-- builder schema. The seed above is the minimum that makes `lf workflow run
-- --workflow d10adea1-…-ak1` resolvable.
