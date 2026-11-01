# Designer Platform

Designer Platform is an enterprise, multi-tenant administration platform. This repository includes the shared control plane and administration frontend; product runtimes are maintained and deployed separately.

Authenticated users can open the in-application Help Center from any screen. The Help action opens documentation for the current platform and its administration workflows, while `/app/help` provides searchable access to all topics.

For a visual overview of the technology stack, service boundaries, data ownership, security, deployment, and key workflows, see [Architecture Guide](docs/ARCHITECTURE.md). For a model-oriented description of routes, state, APIs, data ownership, and business rules, see [Application Logic](docs/APPLICATION_LOGIC.md). For the interactive identity, organisation, role, product, project, and session access model, open the [User Access Guide](docs/USER_ACCESS_GUIDE.html).

## Repository layout

| Path | Purpose |
| --- | --- |
| `apps/frontend` | React 18 + Vite single-page application |
| `apps/core-backend` | NestJS control plane for identity, organisations, roles, projects, settings, products, and sessions |
| `packages/shared` | Types shared by the frontend and core backend |
| `tests/e2e` | Playwright browser tests with deterministic API mocks |

## Prerequisites

- Node.js 20 or newer
- npm
- An externally provisioned PostgreSQL database for the core backend

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the single root environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

   The frontend, core backend, and database scripts read their application settings from this root `.env`.

3. Replace the example secrets. In particular, set a strong `LOCAL_JWT_SECRET` and a base64-encoded 32-byte `CONNECTION_SECRET_KEY`.

4. Configure `CORE_DATABASE_URL` in `.env` to point to the externally provisioned core database. Ensure it exists and the configured user can apply migrations. Product connection records, when needed, are managed through Global Administration; product service runtimes are not included in this repository.

5. Generate/apply the required Drizzle migrations, then seed the core database:

   ```bash
   npm run db:generate:all
   npm run db:setup
   ```

6. Start all applications:

   ```bash
   npm run dev
   ```

| Application | Default URL |
| --- | --- |
| Frontend | `http://localhost:5173` |
| Core API | `http://localhost:4000/api` |

The seed defaults to `admin@global.local` / `ChangeMe123!`. Change that password outside local development.

## Authentication and tenancy

The SPA supports Azure AD B2C and local email/password authentication. Local sessions use a JWT in `localStorage`; B2C sessions use MSAL. API requests prefer the local token, then fall back to an MSAL token.

Optional OIDC login is configured in the root `.env` with `OIDC_WELL_KNOWN`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, and `OIDC_PROVIDER_LABEL`. Register `http://localhost:4000/api/auth/oidc/callback` with the provider for local development. `OIDC_SKIP_VERIFY=true` is development-only and skips ID-token signature checks; it is ignored when `NODE_ENV=production`.

New OIDC users are provisioned as active Members of Global Organisation with the `General User` role. This basic role does not grant access to products or modules; a product-scoped role must be assigned separately.

The selected organisation is persisted in `localStorage`. Core data is scoped by organisation membership, while product data is isolated in each product database. Product access also opens a licensed session; a heartbeat keeps the concurrent-seat lease active.

## Common commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the core API and frontend |
| `npm run dev:frontend` | Start only Vite |
| `npm run dev:core` | Start only the core API |
| `VITE_HOST=0.0.0.0` | Bind frontend development and production preview to all interfaces for IP/LAN access |
| `VITE_CORE_API_URL=http://<server-ip>:4000` | Configure the frontend core API proxy target |
| `VITE_API_BASE=http://<server-ip>:4000/api` | Use the absolute core API URL when serving the production frontend directly |
| `npm run start:prod` | Start the built core API and frontend in production mode |
| `npm run start:prod:core` | Start only the built core API in production mode |
| `npm run start:prod:frontend` | Serve the built frontend with Vite preview |
| `npm run build` | Build/type-check all workspaces through Turborepo with dependency ordering and caching |
| `npm run lint` | Lint workspaces that define a lint script through Turborepo |
| `npm run db:core:migrate` | Apply core database migrations |
| `npm run db:core:seed` | Seed Global Organisation, assign user defaults and modules, and seed roles, menus, and settings |
| `npm run db:generate:all` | Generate Drizzle migrations for included database workspaces |
| `npm run db:migrate:all` | Apply pending migrations for included database workspaces |
| `npm run db:setup` | Apply all migrations and seed the core database |
| `npm run db:reset` | Destructively reset the core database schema, migrate, and seed; requires `DB_RESET_CONFIRM=YES` |
| `npm run test:e2e` | Run all mocked Playwright flows |
| `npm run test:e2e:ui` | Open Playwright UI mode |

When opening the frontend with an IP address, add the matching origin to `CORS_ORIGIN` in the core backend `.env`, for example `http://192.168.1.25:5173`. Rebuild the frontend after changing `VITE_API_BASE`, because Vite embeds this value into the static bundle.

## End-to-end tests

Install the browser once:

```bash
npx playwright install chromium
```

Then run:

```bash
npm run test:e2e
```

The Playwright configuration starts the frontend automatically. Tests mock REST calls in the browser, so normal E2E runs do not require PostgreSQL, Azure AD B2C, or any backend service. This keeps authentication, navigation, CRUD, licensing, and error-flow checks repeatable. To debug:

```bash
npx playwright test --headed
npx playwright test --debug
```

Failure artifacts are written to `test-results/`; the HTML report is written to `playwright-report/`.

## Architecture summary

```text
Browser (React/Vite)
   `-- /api/* ------------> Core Backend (NestJS) ------> external platform_core
```

Vite proxies `/api` to port 4000. The core API owns identities, permissions, tenant configuration, product catalog and connection settings, and license sessions. Product runtimes and their databases are outside this repository.

## Security notes

- Never commit `.env` files, JWT secrets, connection keys, or database passwords.
- Product database passwords are encrypted by the core service before storage.
- Product connection credentials are encrypted by core before storage and are not returned to the frontend.
- Menu access mode is used by the UI but is not a substitute for server-side authorization.

Product runtime apps and databases are not included in this repository. Deploy the corresponding product service separately before using product workflows.

