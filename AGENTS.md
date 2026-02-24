# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a Next.js + Mastra AI monorepo ("Bad Unicorn") for AI-powered recruiter/people research. It has two workspace packages:
- `apps/web` — Next.js 16 frontend + API routes (port 3000)
- `packages/mastra` — Mastra agents, tools, and workflows

### Required environment variables

A `.env` file must exist in the repo root with `OPENAI_API_KEY` and `EXA_API_KEY` set. Without these, the AI agents will fail at runtime. `DATABASE_URL` is optional in local dev (auto-creates LibSQL at `.mastra-dev/mastra.db`).

### Running the app

See `README.md` for standard commands. Key notes:
- `npm run dev` starts the Next.js dev server on port 3000
- `npm run build` builds the production Next.js standalone output
- No ESLint config exists; use `npx tsc --build` for type checking

### Gotchas

- The chat API (`POST /api/chat`) is **non-streaming** and can take 10-20 seconds per request while the AI agent processes and calls Exa tools.
- Node.js >= 22.13.0 is required (specified in root `package.json` engines field).
- The `packages/mastra` package uses `"exports": { ".": "./src/index.ts" }` (source TypeScript), so changes there are picked up immediately by Next.js dev server without a separate build step.
- The Mastra standalone dev server (`npm run dev:mastra`, port 4111) is optional and separate from the main Next.js app.
