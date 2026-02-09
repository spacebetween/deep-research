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
MODEL=openai/gpt-4o-mini
OPENAI_API_KEY=
EXA_API_KEY=
DATABASE_URL=postgres://postgres:postgres@localhost:5432/deep_research
```

`DATABASE_URL` is required because Mastra storage is configured with Postgres.

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

Deployment is configured via GitHub Actions in `.github/workflows/deploy-azure-webapp.yml`.

1. Create an Azure App Service (Linux, Node 24).
2. Add GitHub repository secrets:
- `AZURE_WEBAPP_NAME`
- `AZURE_WEBAPP_PUBLISH_PROFILE`
3. Configure App Service settings:
- `MODEL`
- `OPENAI_API_KEY`
- `EXA_API_KEY`
- `DATABASE_URL`
- `WEBSITE_NODE_DEFAULT_VERSION` = `~24`
4. Push to `main` to deploy.

The workflow builds Next.js standalone output and deploys `release.zip` to the App Service.

## API endpoints

- `POST /api/chat`:
  - Request body: `{ "agentId": "peopleResearchAgent", "messages": [{"role":"user","content":"..."}] }`
  - Response body: `{ "text": "..." }`
- `GET /api/health`: basic health probe.