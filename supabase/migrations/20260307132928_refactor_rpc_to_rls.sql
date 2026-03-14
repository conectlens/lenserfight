-- Phase 1: Enable RLS on core tables
ALTER TABLE content.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE content.thread_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE content.prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE lensers.social_links ENABLE ROW LEVEL SECURITY;

-- Phase 2: Create Policies for `content.threads`
CREATE POLICY "Public threads are viewable by everyone" 
ON content.threads FOR SELECT USING ( visibility IN ('public', 'community') );

CREATE POLICY "Users can create threads" 
ON content.threads FOR INSERT TO authenticated 
WITH CHECK (
  lenser_id IN (SELECT id FROM lensers.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update their own threads" 
ON content.threads FOR UPDATE TO authenticated 
USING (
  lenser_id IN (SELECT id FROM lensers.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can delete their own threads" 
ON content.threads FOR DELETE TO authenticated 
USING (
  lenser_id IN (SELECT id FROM lensers.profiles WHERE user_id = auth.uid())
);

-- Phase 3: Create Policies for `content.prompt_templates`
CREATE POLICY "Public prompts are viewable by everyone" 
ON content.prompt_templates FOR SELECT USING ( visibility IN ('public', 'community') );

CREATE POLICY "Users can create prompts" 
ON content.prompt_templates FOR INSERT TO authenticated 
WITH CHECK (
  lenser_id IN (SELECT id FROM lensers.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update their own prompts" 
ON content.prompt_templates FOR UPDATE TO authenticated 
USING (
  lenser_id IN (SELECT id FROM lensers.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can delete their own prompts" 
ON content.prompt_templates FOR DELETE TO authenticated 
USING (
  lenser_id IN (SELECT id FROM lensers.profiles WHERE user_id = auth.uid())
);

-- Phase 4: Drop removed CRUD Wrapper Functions
DROP FUNCTION IF EXISTS public.fn_content_create_prompt_template CASCADE;
DROP FUNCTION IF EXISTS public.fn_content_create_reply CASCADE;
DROP FUNCTION IF EXISTS public.fn_content_create_thread CASCADE;
DROP FUNCTION IF EXISTS public.fn_content_delete_prompt CASCADE;
DROP FUNCTION IF EXISTS public.fn_content_delete_reply CASCADE;
DROP FUNCTION IF EXISTS public.fn_content_delete_thread CASCADE;
DROP FUNCTION IF EXISTS public.fn_content_update_prompt CASCADE;
DROP FUNCTION IF EXISTS public.fn_content_update_thread CASCADE;
DROP FUNCTION IF EXISTS public.fn_content_tags_create CASCADE;
DROP FUNCTION IF EXISTS public.fn_lensers_create_profile CASCADE;
DROP FUNCTION IF EXISTS public.fn_lensers_update_profile CASCADE;
DROP FUNCTION IF EXISTS public.fn_lensers_insert_social_link CASCADE;
DROP FUNCTION IF EXISTS public.fn_lensers_update_social_link CASCADE;
DROP FUNCTION IF EXISTS public.fn_lensers_delete_social_link CASCADE;
DROP FUNCTION IF EXISTS public.fn_lensers_update_theme CASCADE;
DROP FUNCTION IF EXISTS public.fn_ops_create_contact CASCADE;
DROP FUNCTION IF EXISTS public.fn_public_submit_feedback CASCADE;
