# LenserFight

LenserFight Web is a Vite-powered web application backed by Supabase, built as part of the **ConnectLens** ecosystem.  
The project focuses on perspective-driven interaction, gamification, and community mechanics.

---

## Tech Stack

- **Frontend**: Vite (ES Modules)
- **Backend**: Supabase (PostgreSQL, Auth, RPC, Storage)
- **Language**: TypeScript / JavaScript
- **Linting**: ESLint
- **Formatting**: Prettier
- **Commit Convention**: Conventional Commits (Commitizen)
- **Versioning & Changelog**: standard-version (manual, optional)

---

## Project Status

**Pre-MVP / Unstable**

- Features and schemas may change
- Bugs are expected
- No public release yet
- Version numbers are not meaningful at this stage

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- A Supabase project (local or cloud)

---

### Installation

```bash
npm install
```

## Environment Variables

This project uses **Vite environment variables**.

Create a `.env` file in the project root using `.env.example` as a reference.

```env
# Supabase
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key

# App
VITE_APP_BASE_URL=http://localhost:3000

# Cloudflare Turnstile
VITE_CAPTCHA_SITE_KEY=your-turnstile-site-key
```

### Notes

* `VITE_SUPABASE_ANON_KEY` is safe to expose in the frontend
  Security is enforced via Supabase **Row Level Security (RLS)**.
* The Turnstile **secret key must never be exposed** in the frontend.
* Do **not** commit `.env` files.

---

## Development

### Run the development server

```bash
npm run dev
```

The app will be available at:

```
http://localhost:5173
```

---

## Build & Preview

```bash
npm run build
npm run preview
```

---

## Scripts

| Command            | Description                           |
| ------------------ | ------------------------------------- |
| `npm run dev`      | Start Vite dev server                 |
| `npm run build`    | Build for production                  |
| `npm run preview`  | Preview production build              |
| `npm run lint`     | Run ESLint                            |
| `npm run lint:fix` | Auto-fix lint issues                  |
| `npm run format`   | Format code with Prettier             |
| `npm run release`  | Generate version + changelog (manual) |

---

## Code Quality

### ESLint

* Removes unused imports automatically
* Enforces import ordering
* Prevents unused variables (except `_`-prefixed)

### Prettier

* Handles formatting only
* ESLint is the source of truth for structural rules

---

## Commit Convention

This project follows **Conventional Commits**.

Examples:

```
feat(xp): add weekly leaderboard
fix(auth): prevent refresh token loop
chore(lint): auto-fix imports
```

To create commits interactively:

```bash
npx cz
```

This ensures consistent history and enables automated changelog generation.

---

## Changelog & Releases

* `CHANGELOG.md` is generated using `standard-version`
* Releases are **manual and intentional**
* Not required during early development

When the project reaches beta or first users:

```bash
npm run release
git push --follow-tags
```

This will:

* update `CHANGELOG.md`
* bump version
* create a git tag

---

## Supabase Usage

Supabase is used for:

* Authentication
* PostgreSQL database
* Row Level Security (RLS)
* RPC functions and triggers
* Analytics and XP-related logic

Schema and policies are subject to change during pre-MVP.

---

## Security

* All sensitive access is enforced via Supabase RLS
* Public keys are intentionally public
* Secrets must remain server-side only

---

## License

Private repository.
All rights reserved.

---

## ConnectLens

LenserFight is part of the **ConnectLens ecosystem**, focused on building trust-based, perspective-driven communities using modern web technologies.

```
