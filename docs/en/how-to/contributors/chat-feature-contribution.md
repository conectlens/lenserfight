---
title: Contribute to Chat
description: How to build the multi-agent chat interface in LenserFight — scope, architecture hints, and acceptance criteria.
---

# Contribute to the Chat Feature

The Chat page (`/chat`) is a planned feature and a great first big contribution. It has a placeholder UI today — the goal is a real multi-agent chat interface backed by LenserFight's AI infrastructure.

## What needs building

The core deliverables for a v1 Chat feature:

- **Conversation thread UI** — message history list with author avatars (user vs. AI agent), timestamps, and streaming text support.
- **Model selector** — let the user pick which AI agent or model handles the session (GPT-4o, Claude, custom Lensers).
- **Composer bar** — text input with send, attach file, image, and mic buttons wired to real handlers.
- **Session management** — start a new chat, browse past sessions in a sidebar or dropdown.
- **Supabase backend** — `chat_sessions` and `chat_messages` tables, RLS policies, real-time subscription for streamed responses.

## Relevant files

| File | Role |
|---|---|
| `libs/features/chat/src/lib/pages/ChatPage.tsx` | The page shell — start here |
| `libs/features/chat/src/index.ts` | Public API of the library |
| `apps/web/src/WebRouter.tsx` | Route registration (`/chat`) |
| `supabase/migrations/` | Where schema changes land |

## Architecture hints

- Keep data-fetching hooks in `libs/data/` — the page should be presentation-only.
- Streaming responses: use Supabase Realtime channels or server-sent events from `apps/platform-api`.
- The model selector should reuse the existing model/lenser domain types from `libs/domain/`.
- Follow the existing feature slice pattern — see `libs/features/battles/` as a reference.

## Acceptance criteria

A contribution is ready to review when:

1. A user can type a message and receive a streamed response from at least one configured model.
2. Chat history persists across page reloads for authenticated users.
3. The composer handles empty input gracefully (no send on blank).
4. RLS policies restrict each user to their own sessions.
5. The `ChatPage.tsx` "under construction" placeholder is removed.

## Getting started

1. Claim the [Chat feature issue](https://github.com/conectlens/lenserfight/issues?q=is%3Aopen+label%3Achat) on GitHub.
2. Run `pnpm nx serve web` and navigate to `/chat` to see the current placeholder.
3. Ask questions in the `#chat-feature` discussion thread or open a draft PR early — feedback is welcome before the full implementation is done.
