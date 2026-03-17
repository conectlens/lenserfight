# Supabase Query Rules

- Always request the minimum columns required for the current screen.
- Always set explicit range/limit on list endpoints.
- Prefer cursor-based pagination for large feeds.
- Avoid RPC for ordinary list reads if a narrower direct query is possible.
- If a view hides excessive joins or payload, replace or split it.
- Never fetch candidate supersets into the client for ranking.