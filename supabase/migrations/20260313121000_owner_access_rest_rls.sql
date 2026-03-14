-- Owner-aware REST access for prompts, threads, translations, and private-thread replies.

ALTER TABLE content.prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE content.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE content.thread_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE content.prompt_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE content.thread_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prompt_templates_select_public" ON content.prompt_templates;
CREATE POLICY "prompt_templates_select_public"
ON content.prompt_templates
FOR SELECT
TO anon, authenticated
USING (visibility = 'public');

DROP POLICY IF EXISTS "Authors can see own prompts" ON content.prompt_templates;
CREATE POLICY "Authors can see own prompts"
ON content.prompt_templates
FOR SELECT
TO authenticated
USING (lenser_id = lensers.get_auth_lenser_id());

DROP POLICY IF EXISTS "threads_public_select" ON content.threads;
CREATE POLICY "threads_public_select"
ON content.threads
FOR SELECT
TO anon, authenticated
USING (visibility = 'public');

DROP POLICY IF EXISTS "Authors can see own threads" ON content.threads;
CREATE POLICY "Authors can see own threads"
ON content.threads
FOR SELECT
TO authenticated
USING (lenser_id = lensers.get_auth_lenser_id());

DROP POLICY IF EXISTS "Public can read prompt translations" ON content.prompt_translations;
CREATE POLICY "Public can read prompt translations"
ON content.prompt_translations
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM content.prompt_templates p
    WHERE p.id = prompt_translations.prompt_id
      AND (
        p.visibility = 'public'
        OR (auth.uid() IS NOT NULL AND p.lenser_id = lensers.get_auth_lenser_id())
      )
  )
);

DROP POLICY IF EXISTS "Public can read thread translations" ON content.thread_translations;
CREATE POLICY "Public can read thread translations"
ON content.thread_translations
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM content.threads t
    WHERE t.id = thread_translations.thread_id
      AND (
        t.visibility = 'public'
        OR (auth.uid() IS NOT NULL AND t.lenser_id = lensers.get_auth_lenser_id())
      )
  )
);

DROP POLICY IF EXISTS "thread_replies_public_select" ON content.thread_replies;
CREATE POLICY "thread_replies_public_select"
ON content.thread_replies
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM content.threads t
    WHERE t.id = thread_replies.thread_id
      AND t.visibility = 'public'
  )
);

DROP POLICY IF EXISTS "Thread owners can read replies on own threads" ON content.thread_replies;
CREATE POLICY "Thread owners can read replies on own threads"
ON content.thread_replies
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM content.threads t
    WHERE t.id = thread_replies.thread_id
      AND t.lenser_id = lensers.get_auth_lenser_id()
  )
);

DROP POLICY IF EXISTS "Public can read prompt reactions" ON content.prompt_reactions;
CREATE POLICY "Public can read prompt reactions"
ON content.prompt_reactions
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM content.prompt_templates p
    WHERE p.id = prompt_reactions.prompt_id
      AND (
        p.visibility = 'public'
        OR (auth.uid() IS NOT NULL AND p.lenser_id = lensers.get_auth_lenser_id())
      )
  )
);

DROP POLICY IF EXISTS "Public can read thread reactions" ON content.thread_reactions;
CREATE POLICY "Public can read thread reactions"
ON content.thread_reactions
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM content.threads t
    WHERE t.id = thread_reactions.thread_id
      AND (
        t.visibility = 'public'
        OR (auth.uid() IS NOT NULL AND t.lenser_id = lensers.get_auth_lenser_id())
      )
  )
);

DROP POLICY IF EXISTS "Public can read reply reactions" ON content.thread_reply_reactions;
CREATE POLICY "Public can read reply reactions"
ON content.thread_reply_reactions
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM content.thread_replies r
    JOIN content.threads t ON t.id = r.thread_id
    WHERE r.id = thread_reply_reactions.reply_id
      AND (
        t.visibility = 'public'
        OR (auth.uid() IS NOT NULL AND t.lenser_id = lensers.get_auth_lenser_id())
      )
  )
);
