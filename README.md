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
DATABASE_URL=postgres://postgres:postgres@localhost:5432/deep_research  # optional in local dev, required in production

# Microsoft Entra ID authentication
AUTH_SECRET=                              # `npx auth secret` to generate
AUTH_MICROSOFT_ENTRA_ID_ID=               # Application (client) ID from Azure
AUTH_MICROSOFT_ENTRA_ID_SECRET=           # Client secret value from Azure
AUTH_MICROSOFT_ENTRA_ID_TENANT_ID=        # Directory (tenant) ID — restricts login to your org (omit for multi-tenant)
```

If `DATABASE_URL` is not set in local development, the app falls back to a local LibSQL file at `.mastra-dev/mastra.db`.
In production, Postgres is used and you can set either:
- `DATABASE_URL`
- `AZURE_POSTGRESQL_DATABASE`, `AZURE_POSTGRESQL_HOST`, `AZURE_POSTGRESQL_PASSWORD`, `AZURE_POSTGRESQL_PORT`, `AZURE_POSTGRESQL_SSL`, `AZURE_POSTGRESQL_USER`

## Microsoft Entra ID authentication setup

The app uses [NextAuth.js v5](https://authjs.dev) with the Microsoft Entra ID provider. Users must sign in with their Microsoft 365 account to access the app.

### Azure app registration

1. Go to [Azure Portal → Microsoft Entra ID → App registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade).
2. Click **New registration**.
3. Set **Name** to e.g. "Bad Unicorn".
4. Set **Supported account types** to "Accounts in this organizational directory only" (single tenant) or your preferred option.
5. Set **Redirect URI** to **Web** → `http://localhost:3000/api/auth/callback/microsoft-entra-id` (for local dev).
6. Click **Register**.
7. Copy the **Application (client) ID** → `AUTH_MICROSOFT_ENTRA_ID_ID`.
8. Copy the **Directory (tenant) ID** → `AUTH_MICROSOFT_ENTRA_ID_TENANT_ID`.
9. Go to **Certificates & secrets** → **New client secret** → copy the **Value** → `AUTH_MICROSOFT_ENTRA_ID_SECRET`.
10. Generate `AUTH_SECRET` by running `npx auth secret` or `openssl rand -base64 33`.

For production, add a second redirect URI: `https://your-domain.com/api/auth/callback/microsoft-entra-id`.

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
4. Push to `main` to deploy.

The workflow builds Next.js standalone output and deploys `release.zip` to the App Service.

## API endpoints

- `POST /api/chat`:
  - Request body: `{ "agentId": "peopleResearchAgent", "messages": [{"role":"user","content":"..."}] }`
  - Response body: `{ "text": "..." }`
- `GET /api/health`: basic health probe.
