# Workflow Connectors

Workflow connectors let a LenserFight user connect an external service once and
reuse that connection from workflow nodes through connector references such as
`[[:connector:google.sheets.primary]]`.

Connector credentials are resolved only by server-side execution workers. The
browser, workflow JSON, node outputs, logs, battle pages, agent prompts, and
public result pages must never receive access tokens, refresh tokens, API keys,
webhook secrets, or vault identifiers.

## Runtime Model

- Provider discovery lives in `@lenserfight/domain/oauth-connections`.
- Workflow runners declare provider, capability, operation, and scopes.
- `ConnectorRuntime` resolves credentials server-side and dispatches to provider
  adapters.
- Adapters return sanitized `ExecutionResult` objects whose `data` can flow to
  downstream DAG nodes.
- Existing inbound platform API connectors under `connectors.*` remain separate.

## Provider Status

Priority workflow providers have deterministic mocked adapters in this phase:
Notion, Google Sheets, Asana, Monday.com, Zapier, Slack, GitHub, Jira, Linear,
and Webhook / Custom HTTP.

Metadata-only providers are visible for planning and contributor extension:
GitLab, Trello, Airtable, HubSpot, Salesforce, Discord, Microsoft Teams,
Microsoft Outlook, Microsoft OneDrive, Microsoft Excel Online, Dropbox, Box,
Calendly, ClickUp, and Todoist.

Unavailable runtime operations return `connector_operation_unavailable` instead
of pretending to call the provider.

## Security Rules

- Validate connector refs at save time where possible and again during execution.
- Validate provider, capability, scopes, owner, workspace, active status, and
  revocation before use.
- Store secrets in Supabase Vault and expose only safe metadata through RPCs.
- Mask `token`, `secret`, `password`, `authorization`, `apiKey`, and cookie-like
  fields in logs and outputs.
- Do not include private external data in AI model prompts unless the workflow
  node explicitly declares that behavior and the user chooses it.

## Custom HTTP

Custom HTTP is high risk and must use the server-side safety layer:

- HTTPS only.
- Explicit allowlisted origins or hosts in sanitized connector config.
- Block localhost, private IP ranges, link-local hosts, and metadata services.
- Strip unsafe headers.
- Do not forward credentials by default.
- Cap response size and enforce timeout/retry limits in production adapters.

## Examples

- Notion database row to Lens input: `notion.database.primary` with
  `query_database`, then map returned row fields into a downstream Lens node.
- Google Sheets row to workflow generation node: `google.sheets.primary` with
  `read_range`, then use `data.request.range` or mocked row data downstream.
- Asana task creation from workflow result: `asana.tasks.primary` with
  `create_task`.
- Monday.com item creation from AI-generated output: `monday.boards.primary`
  with `create_item`.
- Zapier webhook trigger from completed workflow: `zapier.webhooks.primary`
  with `trigger_webhook`.
- Slack notification after workflow completion: `slack.chat.primary` with
  `send_message`.
- GitHub issue creation from workflow analysis: `github.repos.primary` with
  `create_issue`.
- Jira ticket creation from bug triage workflow: `jira.issues.primary` with
  `create_issue`.
- Linear issue creation from product planning workflow: `linear.issues.primary`
  with `create_issue`.
- Custom HTTP export: `custom_http.http.primary` with `send_request` and an
  allowlisted HTTPS host.

## Adding A Provider

Add provider metadata to the domain registry, add or reuse a focused runtime
adapter, expose connector_ref fields in workflow descriptors, add mocked tests,
and update this support matrix. Do not add provider-specific branching to the
workflow execution engine.
