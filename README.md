# Deep Research Monorepo

Monorepo containing:

- `apps/web`: Next.js chat interface and API routes
- `packages/mastra`: Mastra agents, tools, and workflows

The chat API is non-streaming and currently targets `peopleResearchAgent` by default.

## Workspace setup

```bash
npm install
```

## Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

Create `.env` in the repo root:

```bash
MODEL=openai/gpt-5.5
OPENAI_API_KEY=
EXA_API_KEY=
DATABASE_URL=postgres://postgres:postgres@localhost:5432/deep_research  # optional in local dev, required in production
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=
```

If `DATABASE_URL` is not set in local development, the app falls back to a local LibSQL file at `.mastra-dev/mastra.db`.
In production, Postgres is used and you can set either:
- `DATABASE_URL`
- `AZURE_POSTGRESQL_DATABASE`, `AZURE_POSTGRESQL_HOST`, `AZURE_POSTGRESQL_PASSWORD`, `AZURE_POSTGRESQL_PORT`, `AZURE_POSTGRESQL_SSL`, `AZURE_POSTGRESQL_USER`

Optional first-party observability:
- `OBSERVABILITY_ENABLED`: defaults to `true` in development and `false` in production.
- `OBSERVABILITY_CAPTURE_MESSAGES`: `off`, `summary`, or `full`; defaults to `full` in development and `summary` in production.
- `OBSERVABILITY_CAPTURE_RESULTS`: `off`, `summary`, or `full`; defaults to `full` in development and `summary` in production.
- `OBSERVABILITY_CAPTURE_FULL_CONTENT`: set to `true` to persist full tool-result content; defaults to `false`.
- `OBSERVABILITY_ADMIN_SECRET`: required to view `/observability?secret=...` outside local development.
- `OBSERVABILITY_RETENTION_DAYS`: deletes older request/tool records on startup, defaults to `30`.

When enabled without `DATABASE_URL` in local development, observability stores data in `.mastra-dev/observability.db`.

Authentication uses Microsoft Entra ID through the Next.js app. Configure the Entra app registration with these web redirect URIs:
- `http://localhost:3000/api/auth/callback/azure-ad`
- `https://<production-host>/api/auth/callback/azure-ad`

Set `AZURE_AD_TENANT_ID` to the tenant that is allowed to use the tool. The app rejects tokens from any other tenant.

## Monorepo structure

```text
apps/
  web/
    app/
      api/chat/route.ts
      api/health/route.ts
packages/
  mastra/
    src/
      agents/
      tools/
      workflows/
```

## Azure App Service deployment (single app)

Deployment is configured via GitHub Actions in `.github/workflows/main_deep-research.yml`.

1. Create an Azure App Service (Linux, Node 24).
2. Add GitHub repository secrets:
- `AZURE_WEBAPP_NAME`
- `AZURE_WEBAPP_PUBLISH_PROFILE`
3. Configure App Service settings:
- `MODEL`
- `OPENAI_API_KEY`
- `EXA_API_KEY`
- `DATABASE_URL` (or the `AZURE_POSTGRESQL_*` settings above)
- `WEBSITE_NODE_DEFAULT_VERSION` = `~24`
- `NEXTAUTH_URL` = `https://<production-host>`
- `NEXTAUTH_SECRET`
- `AZURE_AD_CLIENT_ID`
- `AZURE_AD_CLIENT_SECRET`
- `AZURE_AD_TENANT_ID`
4. Push to `main` to deploy.

The workflow builds Next.js standalone output and deploys `release.zip` to the App Service.

## API endpoints

- `POST /api/chat`:
  - Request body: `{ "agentId": "peopleResearchAgent", "messages": [{"role":"user","content":"..."}], "sessionId": "...", "conversationId": "..." }`
  - Response body: `{ "text": "..." }`
- `POST /api/agent`: recruiter sourcing chat endpoint. Accepts optional `sessionId` and `conversationId`; returns `x-request-id`.
- `POST /api/observability/events`: records LinkedIn clicks and result-quality feedback against a request/session/conversation.
- `GET /observability`: local/debug observability dashboard. In production, use `/observability?secret=<OBSERVABILITY_ADMIN_SECRET>`.
- `GET /observability/sessions`: grouped session/conversation explorer.
- `GET /observability/requests/{requestId}`: full request detail with query, response, criteria, searches, tool calls, candidates, clicks, and feedback.
- `GET /api/health`: basic health probe.
