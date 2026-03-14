-- supabase/migrations/20260308144500_secure_translations_rls.sql

-- 1. Prompt Templates & Threads: Authors must see their own private content
DROP POLICY IF EXISTS "Authors can see own prompts" ON content.prompt_templates;
CREATE POLICY "Authors can see own prompts" 
ON content.prompt_templates FOR SELECT TO authenticated 
USING (lenser_id = lensers.get_auth_lenser_id());

DROP POLICY IF EXISTS "Authors can see own threads" ON content.threads;
CREATE POLICY "Authors can see own threads" 
ON content.threads FOR SELECT TO authenticated 
USING (lenser_id = lensers.get_auth_lenser_id());


-- 2. Prompt Translations Policies
ALTER TABLE "content"."prompt_translations" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authors can insert prompt translations" ON "content"."prompt_translations";
CREATE POLICY "Authors can insert prompt translations" 
ON "content"."prompt_translations" 
FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "content"."prompt_templates" p
    WHERE p.id = prompt_id AND p.lenser_id = lensers.get_auth_lenser_id()
  )
);

DROP POLICY IF EXISTS "Authors can update prompt translations" ON "content"."prompt_translations";
CREATE POLICY "Authors can update prompt translations" 
ON "content"."prompt_translations" 
FOR UPDATE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM "content"."prompt_templates" p
    WHERE p.id = prompt_id AND p.lenser_id = lensers.get_auth_lenser_id()
  )
);

DROP POLICY IF EXISTS "Authors can delete prompt translations" ON "content"."prompt_translations";
CREATE POLICY "Authors can delete prompt translations" 
ON "content"."prompt_translations" 
FOR DELETE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM "content"."prompt_templates" p
    WHERE p.id = prompt_id AND p.lenser_id = lensers.get_auth_lenser_id()
  )
);


-- 3. Thread Translations Policies
ALTER TABLE "content"."thread_translations" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authors can insert thread translations" ON "content"."thread_translations";
CREATE POLICY "Authors can insert thread translations" 
ON "content"."thread_translations" 
FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "content"."threads" t
    WHERE t.id = thread_id AND t.lenser_id = lensers.get_auth_lenser_id()
  )
);

DROP POLICY IF EXISTS "Authors can update thread translations" ON "content"."thread_translations";
CREATE POLICY "Authors can update thread translations" 
ON "content"."thread_translations" 
FOR UPDATE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM "content"."threads" t
    WHERE t.id = thread_id AND t.lenser_id = lensers.get_auth_lenser_id()
  )
);

DROP POLICY IF EXISTS "Authors can delete thread translations" ON "content"."thread_translations";
CREATE POLICY "Authors can delete thread translations" 
ON "content"."thread_translations" 
FOR DELETE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM "content"."threads" t
    WHERE t.id = thread_id AND t.lenser_id = lensers.get_auth_lenser_id()
  )
);


-- 4. Tag Map Policies
ALTER TABLE "content"."tag_map" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no_direct_modify" ON "content"."tag_map";

DROP POLICY IF EXISTS "Public can read tag maps" ON "content"."tag_map";
CREATE POLICY "Public can read tag maps" ON "content"."tag_map" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authors can manage tags for their content" ON "content"."tag_map";
CREATE POLICY "Authors can manage tags for their content" 
ON "content"."tag_map" 
FOR ALL TO authenticated 
USING (
  (entity_type = 'prompt_template' AND EXISTS (SELECT 1 FROM "content"."prompt_templates" p WHERE p.id = entity_id AND p.lenser_id = lensers.get_auth_lenser_id())) OR
  (entity_type = 'thread' AND EXISTS (SELECT 1 FROM "content"."threads" t WHERE t.id = entity_id AND t.lenser_id = lensers.get_auth_lenser_id()))
);
