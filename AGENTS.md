# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a Next.js + Mastra AI monorepo ("Bad Unicorn") for AI-powered recruiter/people research. It has two workspace packages:
- `apps/web` — Next.js 16 frontend + API routes (port 3000)
- `packages/mastra` — Mastra agents, tools, and workflows

### Required environment variables

A `.env` file must exist in the repo root with `OPENAI_API_KEY` and `EXA_API_KEY` set. Without these, the AI agents will fail at runtime. `DATABASE_URL` is optional in local dev (auto-creates LibSQL at `.mastra-dev/mastra.db`).

For authentication, the following are also required:
- `AUTH_SECRET` — session encryption key (generate with `npx auth secret`)
- `AUTH_MICROSOFT_ENTRA_ID_ID` — Application (client) ID from Azure
- `AUTH_MICROSOFT_ENTRA_ID_SECRET` — Client secret from Azure
- `AUTH_MICROSOFT_ENTRA_ID_TENANT_ID` — Directory (tenant) ID to restrict to your org (optional; omit for multi-tenant)

### Running the app

See `README.md` for standard commands. Key notes:
- `npm run dev` starts the Next.js dev server on port 3000
- `npm run build` builds the production Next.js standalone output
- No ESLint config exists; use `npx tsc --build` for type checking

### Authentication

Microsoft Entra ID (Azure AD) auth is configured via NextAuth.js v5 (`next-auth@beta`). Key files:
- `apps/web/auth.ts` — Auth.js config (provider, callbacks, custom pages)
- `apps/web/middleware.ts` — Protects all routes; `/api/health` and `/auth/signin` are public
- `apps/web/app/api/auth/[...nextauth]/route.ts` — NextAuth API handler
- `apps/web/app/auth/signin/page.tsx` — Custom sign-in page
- `apps/web/components/ui/user-menu.tsx` — Header user avatar + sign-out dropdown

The sign-in page form POSTs directly to `/api/auth/signin/microsoft-entra-id`. The `UserMenu` sign-out form POSTs to `/api/auth/signout`. The callback URL for the Azure app registration must be `<your-domain>/api/auth/callback/microsoft-entra-id`.

### Gotchas

- The chat API (`POST /api/chat`) is **non-streaming** and can take 10-20 seconds per request while the AI agent processes and calls Exa tools.
- Node.js >= 22.13.0 is required (specified in root `package.json` engines field).
- The `packages/mastra` package uses `"exports": { ".": "./src/index.ts" }` (source TypeScript), so changes there are picked up immediately by Next.js dev server without a separate build step.
- The Mastra standalone dev server (`npm run dev:mastra`, port 4111) is optional and separate from the main Next.js app.
- Next.js 16 shows a deprecation warning about `middleware.ts` recommending `proxy` instead. This is a Next.js 16 migration notice and can be ignored for now; the middleware works correctly.
