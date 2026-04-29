CREATE OR REPLACE FUNCTION public.fn_ai_catalog_models(
  p_provider_key text DEFAULT NULL,
  p_support_level text DEFAULT NULL,
  p_capability text DEFAULT NULL,
  p_modality text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  provider_id uuid,
  provider_key text,
  provider_name text,
  key text,
  name text,
  description text,
  docs_url text,
  support_level text,
  status text,
  capabilities text[],
  input_modalities text[],
  output_modalities text[],
  context_window_tokens integer,
  supports_tools boolean,
  supports_json_schema boolean,
  supports_vision boolean,
  supports_streaming boolean,
  use_cases text[],
  developer_summary text,
  user_summary text,
  metadata jsonb,
  unit_type text,
  cost_per_unit numeric,
  input_cost_per_1k_tokens numeric,
  output_cost_per_1k_tokens numeric,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'ai'
AS $$
  SELECT
    m.id,
    m.provider_id,
    p.key AS provider_key,
    p.display_name AS provider_name,
    m.key,
    m.name,
    m.description,
    COALESCE(m.docs_url, m.provider_url),
    m.support_level,
    m.status,
    m.capabilities,
    m.input_modalities,
    m.output_modalities,
    m.context_window_tokens,
    m.supports_tools,
    m.supports_json_schema,
    m.supports_vision,
    m.supports_streaming,
    m.use_cases,
    m.developer_summary,
    m.user_summary,
    m.metadata,
    pricing.unit_type,
    pricing.cost_per_unit,
    pricing.input_cost_per_1k_tokens,
    pricing.output_cost_per_1k_tokens,
    m.is_active
  FROM ai.models m
  JOIN ai.providers p ON p.id = m.provider_id
  LEFT JOIN LATERAL (
    SELECT
      mp.unit_type::text AS unit_type,
      mp.cost_per_unit,
      mp.input_cost_per_1k_tokens,
      mp.output_cost_per_1k_tokens
    FROM ai.model_pricing mp
    WHERE mp.model_id = m.id
      AND mp.effective_from <= now()
      AND (mp.effective_to IS NULL OR mp.effective_to > now())
    ORDER BY mp.effective_from DESC
    LIMIT 1
  ) AS pricing ON TRUE
  WHERE (p_provider_key IS NULL OR p.key = p_provider_key)
    AND (p_support_level IS NULL OR m.support_level = p_support_level)
    AND (p_capability IS NULL OR p_capability = ANY (m.capabilities))
    AND (
      p_modality IS NULL OR
      p_modality = ANY (m.input_modalities) OR
      p_modality = ANY (m.output_modalities)
    )
  ORDER BY
    CASE m.support_level
      WHEN 'runnable' THEN 0
      WHEN 'byok_only' THEN 1
      WHEN 'catalog_only' THEN 2
      ELSE 3
    END,
    p.display_name,
    m.name;
$$;

ALTER FUNCTION public.fn_ai_catalog_models(text, text, text, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_ai_catalog_models(text, text, text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_ai_catalog_model_detail(
  p_provider_key text,
  p_model_key text
)
RETURNS TABLE (
  id uuid,
  provider_id uuid,
  provider_key text,
  provider_name text,
  key text,
  name text,
  description text,
  docs_url text,
  support_level text,
  status text,
  capabilities text[],
  input_modalities text[],
  output_modalities text[],
  context_window_tokens integer,
  supports_tools boolean,
  supports_json_schema boolean,
  supports_vision boolean,
  supports_streaming boolean,
  use_cases text[],
  developer_summary text,
  user_summary text,
  metadata jsonb,
  unit_type text,
  cost_per_unit numeric,
  input_cost_per_1k_tokens numeric,
  output_cost_per_1k_tokens numeric,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'ai'
AS $$
  SELECT *
  FROM public.fn_ai_catalog_models(p_provider_key, NULL, NULL, NULL)
  WHERE key = p_model_key
  LIMIT 1;
$$;

ALTER FUNCTION public.fn_ai_catalog_model_detail(text, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_ai_catalog_model_detail(text, text) TO anon, authenticated, service_role;
