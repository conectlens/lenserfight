-- RFC-0006: Tool Registry Endpoint & Credential Schema
-- Adds the columns a future dispatcher needs to actually call a registered
-- tool (endpoint, method, request shape, credential reference) without
-- storing any raw secret in agents.tools_registry itself.
-- See docs/en/rfcs/RFC-0006-tool-dispatch-schema.md for the full design.

ALTER TABLE "agents"."tools_registry"
  ADD COLUMN "endpoint_url" "text",
  ADD COLUMN "http_method" "text" DEFAULT 'POST'::"text" NOT NULL,
  ADD COLUMN "request_template" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
  ADD COLUMN "auth_placement" "text" DEFAULT 'header'::"text" NOT NULL,
  ADD COLUMN "auth_param_name" "text" DEFAULT 'Authorization'::"text" NOT NULL,
  ADD COLUMN "credential_ref" "uuid";

ALTER TABLE "agents"."tools_registry"
  ADD CONSTRAINT "tools_registry_http_method_check"
    CHECK (("http_method" = ANY (ARRAY['GET'::"text", 'POST'::"text", 'PUT'::"text", 'PATCH'::"text", 'DELETE'::"text"]))),
  ADD CONSTRAINT "tools_registry_auth_placement_check"
    CHECK (("auth_placement" = ANY (ARRAY['header'::"text", 'query'::"text"]))),
  ADD CONSTRAINT "tools_registry_endpoint_required_unless_none_check"
    CHECK (("egress_class" = 'none'::"text") OR ("endpoint_url" IS NOT NULL));

COMMENT ON COLUMN "agents"."tools_registry"."endpoint_url" IS 'Absolute URL a dispatcher calls to execute this tool. Required unless egress_class = ''none''.';
COMMENT ON COLUMN "agents"."tools_registry"."http_method" IS 'HTTP method the dispatcher uses to call endpoint_url.';
COMMENT ON COLUMN "agents"."tools_registry"."request_template" IS 'Static request shape (headers/body skeleton) the dispatcher merges the invocation input into.';
COMMENT ON COLUMN "agents"."tools_registry"."auth_placement" IS 'Where the dispatcher writes the resolved credential: header or query.';
COMMENT ON COLUMN "agents"."tools_registry"."auth_param_name" IS 'Header or query-param name the resolved credential is written to (e.g. Authorization).';
COMMENT ON COLUMN "agents"."tools_registry"."credential_ref" IS 'Opaque pointer into the credential store (see RFC-0006 / issue #461). Never a raw secret value. Required whenever auth_method <> ''none'' — enforced once the credential store exists.';
