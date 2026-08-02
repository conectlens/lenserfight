# Notice

LenserFight is MIT-licensed (see [LICENSE](LICENSE)). This file credits the major open-source
projects it's built on. It covers direct, load-bearing dependencies and frameworks — not every
transitive package; run `pnpm licenses list` for the full dependency tree.

## Core stack

| Project | License | Used for |
|---|---|---|
| [React](https://github.com/facebook/react) | MIT | UI (`apps/web`, `apps/auth`, `apps/arena`) |
| [React Native](https://github.com/facebook/react-native) | MIT | Mobile app (`apps/mobile`) |
| [React Router](https://github.com/remix-run/react-router) | MIT | Routing |
| [Vite](https://github.com/vitejs/vite) | MIT | Build tooling |
| [VitePress](https://github.com/vuejs/vitepress) | MIT | Documentation site (`apps/docs`) |
| [Nx](https://github.com/nrwl/nx) | MIT | Monorepo tooling |
| [TypeScript](https://github.com/microsoft/TypeScript) | Apache-2.0 | Primary language |
| [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | MIT | Styling |
| [Supabase](https://github.com/supabase/supabase) (`@supabase/supabase-js`) | MIT / Apache-2.0 | Database, auth, storage, edge functions |
| [Zod](https://github.com/colinhacks/zod) | MIT | Schema validation |
| [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk) | MIT | `apps/mcp-server` |
| [OpenCode](https://github.com/sst/opencode) (`@opencode-ai/plugin`) | MIT | Plugin bridge exposing `lf` commands to OpenCode (`libs/adapters/opencode`, `apps/cli`) |
| [ESLint](https://github.com/eslint/eslint), [Prettier](https://github.com/prettier/prettier), [Jest](https://github.com/jestjs/jest), [Vitest](https://github.com/vitest-dev/vitest) | MIT | Lint, format, test |

## Trademarks

The LenserFight name and logo are trademarks of ConectLens. This notice and the MIT License cover
the source code only, not trademark rights — see [README.md](README.md#security-support-and-license).
