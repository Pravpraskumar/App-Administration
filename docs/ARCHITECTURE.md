# Designer Platform Architecture

This guide explains the administration platform's architecture, technology choices, ownership boundaries, and principal workflows. Product service runtimes are maintained separately. For retained product data contracts and detailed core routes, see [Application Logic](APPLICATION_LOGIC.md).

## 1. Platform at a glance

Designer Platform is a multi-tenant administration platform. The included core control plane manages identity, organisations, permissions, product licensing, connections, and sessions. Product service runtimes are not included in this repository.

```mermaid
%%{init: {"themeVariables": {"fontSize": "22px"}, "flowchart": {"useMaxWidth": false}, "sequence": {"useMaxWidth": false}, "state": {"useMaxWidth": false}}}%%
flowchart LR
    User[Browser user]
    SPA[React SPA]
    Core[Core control plane]
    CoreDB[(platform_core)]

    User --> SPA
    SPA -->|/api/*| Core
    Core --> CoreDB
```

The central design rule is **control-plane data stays in core; product-domain data belongs to its owning product service**. Product connection settings and existing product data contracts remain in core, but product runtimes must be deployed separately.

## 2. Technology stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Workspace | npm workspaces, Node.js 20+ | Monorepo dependency and script management |
| Web client | React 18, TypeScript, Vite 5 | Single-page application and development proxy |
| Navigation | React Router 6 | Public, organisation, and administration routes |
| Server state | TanStack Query 5 | Query lifecycle and cache infrastructure |
| Styling | Tailwind CSS 3, PostCSS | Responsive UI styling |
| Icons | Lucide React | Consistent accessible interface icons |
| Authentication client | MSAL Browser/React | Azure AD B2C redirect and token acquisition |
| APIs | NestJS 10, TypeScript | Core administration HTTP service |
| Validation | class-validator, class-transformer | Core DTO validation and transformation |
| Persistence | PostgreSQL 16, Drizzle ORM | Isolated relational stores and migrations |
| Local authentication | bcryptjs, JSON Web Tokens | Password hashing and platform-issued sessions |
| Email | Nodemailer | Review notifications and auditable delivery attempts |
| Documents | External product-service storage | Product attachment content is not served by this repository |
| Browser testing | Playwright | Deterministic end-to-end route and workflow tests |
| Database | External PostgreSQL | Core database provisioned outside this repository |

## 3. Monorepo design

```mermaid
%%{init: {"themeVariables": {"fontSize": "22px"}, "flowchart": {"useMaxWidth": false}, "sequence": {"useMaxWidth": false}, "state": {"useMaxWidth": false}}}%%
flowchart TB
    Repo[Designer Platform]
    Apps[apps]
    Packages[packages]
    Tests[tests/e2e]
    Docs[docs]

    Repo --> Apps
    Repo --> Packages
    Repo --> Tests
    Repo --> Docs

    Apps --> Frontend[frontend]
    Apps --> CoreApp[core-backend]
    Packages --> Shared[shared contracts]
    Shared -. TypeScript contracts .-> Frontend
    Shared -. TypeScript contracts .-> CoreApp
```

| Workspace | Responsibility |
| --- | --- |
| `apps/frontend` | Responsive SPA for platform and administration experiences |
| `apps/core-backend` | Identity, tenancy, RBAC, menus, products, projects, settings, licensing, sessions, email, and encrypted integration configuration |
| `packages/shared` | Shared TypeScript API contracts and role constants |
| `tests/e2e` | Playwright tests with deterministic browser-level API mocks |

## 4. Runtime topology

```mermaid
%%{init: {"themeVariables": {"fontSize": "22px"}, "flowchart": {"useMaxWidth": false}, "sequence": {"useMaxWidth": false}, "state": {"useMaxWidth": false}}}%%
flowchart LR
    Browser[Browser<br/>localhost:5173]
    Vite[Vite dev server and proxy]
    CoreAPI[Core NestJS API<br/>localhost:4000/api]
    CoreDB[(External database<br/>platform_core)]

    Browser --> Vite
    Vite -->|/api| CoreAPI
    CoreAPI -->|platform_core| CoreDB
```

The browser uses relative URLs. In development, Vite routes core traffic. Core connects to its externally provisioned database; product services and their databases are managed separately.

| Runtime | Port | Public prefix | Database |
| --- | ---: | --- | --- |
| Frontend | 5173 | `/` | None |
| Core backend | 4000 | `/api` | `platform_core` |

## 5. Frontend design

The provider order is an application invariant because later providers consume earlier context:

```mermaid
%%{init: {"themeVariables": {"fontSize": "22px"}, "flowchart": {"useMaxWidth": false}, "sequence": {"useMaxWidth": false}, "state": {"useMaxWidth": false}}}%%
flowchart TB
    Query[QueryClientProvider]
    API[ApiProvider]
    Session[SessionProvider]
    Theme[ThemeProvider]
    Org[OrgProvider]
    Router[RouterProvider]

    Query --> API --> Session --> Theme --> Org --> Router
```

- `ApiProvider` owns authenticated core and CreditGuard request helpers.
- `SessionProvider` owns the local user, JWT lifecycle, and sign-out behavior.
- `ThemeProvider` loads shared and personal appearance settings.
- `OrgProvider` owns the active tenant selection.
- `RouterProvider` renders routes after all required state is available.

Navigation is data-driven. Core returns the current user's menu tree, while React Router supplies route boundaries. Menu visibility improves usability but is not an authorization control; APIs must independently enforce access.

## 6. Identity, tenancy, and authorization

The SPA supports local credentials and Azure AD B2C. Local JWTs take precedence when both mechanisms are available.

```mermaid
%%{init: {"themeVariables": {"fontSize": "22px"}, "flowchart": {"useMaxWidth": false}, "sequence": {"useMaxWidth": false}, "state": {"useMaxWidth": false}}}%%
sequenceDiagram
    actor User
    participant SPA as React SPA
    participant B2C as Azure AD B2C
    participant Core as Core API
    participant DB as platform_core

    alt Local sign-in
        User->>SPA: Email and password
        SPA->>Core: POST /auth/login
        Core->>DB: Verify user and password hash
        Core-->>SPA: JWT and user profile
    else Microsoft sign-in
        User->>SPA: Microsoft sign-in
        SPA->>B2C: Redirect authentication
        B2C-->>SPA: Access token
        SPA->>Core: Bearer token
        Core->>B2C: Validate issuer and JWKS
        Core->>DB: Provision or link user
    end
    SPA->>Core: Authenticated tenant request
    Core->>DB: Check role and organisation membership
    Core-->>SPA: Tenant-scoped response
```

Authorization has several dimensions:

| Control | Meaning |
| --- | --- |
| Global role | Platform-wide authority such as `Global Administrator` |
| Organisation membership | Tenant authority: `Owner`, `Admin`, or `Member` |
| Product role | Module behavior such as `CreditGuard Requestor` or `CreditGuard Reviewer` |
| Menu grant | Route visibility and optional `readonly`/`editable` presentation |
| Module allocation | Whether an organisation is licensed for a product |
| Project allocation | Whether project-scoped product access is available |
| Session lease | Whether a concurrent product/admin seat is currently held |

Every tenant-sensitive query must authorize the supplied organisation identifier. UI hiding alone is never the security boundary.

## 7. Retained product data ownership reference

This diagram documents data ownership for separately deployed product services; those service runtimes are not included in this repository.

```mermaid
%%{init: {"themeVariables": {"fontSize": "22px"}, "flowchart": {"useMaxWidth": false}, "sequence": {"useMaxWidth": false}, "state": {"useMaxWidth": false}}}%%
flowchart TB
    Core[Core service]
    CoreDB[(platform_core)]
    CG[CreditGuard service]
    CGDB[(creditguard)]
    Prime[PRIME service]
    PrimeDB[(prime)]
    Blob[(Local files or private Azure Blob)]

    Core --> CoreDB
    CG --> CGDB
    CG --> Blob
    Prime --> PrimeDB

    CoreDB --- CoreData[Users, organisations, roles,<br/>menus, modules, projects,<br/>sessions, settings, integrations]
    CGDB --- CGData[Requests, details, entities,<br/>attachment metadata, approvers,<br/>approval state and envelope IDs]
    PrimeDB --- PrimeData[Placeholder domain records]
```

Cross-service actions are coordinated application workflows, not atomic distributed transactions. Each service must fail explicitly and preserve recoverable state when a downstream operation fails.

## 8. Retained CreditGuard lifecycle reference

```mermaid
%%{init: {"themeVariables": {"fontSize": "22px"}, "flowchart": {"useMaxWidth": false}, "sequence": {"useMaxWidth": false}, "state": {"useMaxWidth": false}}}%%
stateDiagram-v2
    [*] --> Draft
    Draft --> UnderReview: Submit with attachment and reviewer
    UnderReview --> UnderReview: Attach or replace generated request PDF
    UnderReview --> UnderReview: Requestor or administrator reassigns reviewer
    UnderReview --> Reviewed: Assigned reviewer completes review
    Reviewed --> SentForApproval: Finalize approvers and initiate Signit
    SentForApproval --> SentForApproval: Refresh recipient states
    SentForApproval --> Reviewed: Administrator recalls envelope
```

The API owns these workflow transitions. While attachments are editable, **Attach Request** creates a new McDermott-branded PDF from request and business details, excluding approval and approver fields, and atomically inserts or replaces its attachment metadata. Before review completion, the requestor or an administrator may reassign the reviewer without unlocking request fields; the former reviewer receives a pullback email and the replacement receives the standard review notification. Review completion is a separate status/audit transition and does not generate a document. Forms become progressively more restricted as the request advances, and sent requests are immutable through ordinary edit, attachment, and approver endpoints. Refresh updates approver records but deliberately leaves the request at `Sent for Approval`.

## 9. Retained Signit integration reference

Signit credentials are tenant/product configuration owned by core. They are encrypted at rest with AES-256-GCM and never returned to the browser or CreditGuard service.

```mermaid
%%{init: {"themeVariables": {"fontSize": "22px"}, "flowchart": {"useMaxWidth": false}, "sequence": {"useMaxWidth": false}, "state": {"useMaxWidth": false}}}%%
sequenceDiagram
    actor User
    participant SPA as Approval screen
    participant CG as CreditGuard API
    participant CGDB as creditguard DB
    participant Core as Core integration broker
    participant CoreDB as platform_core DB
    participant Signit as Signit API

    User->>SPA: Select PDFs and initiate approval
    SPA->>CG: POST /requests/:id/initiate-approval
    CG->>CGDB: Lock and validate request, PDFs, approvers
    CG->>Core: Bearer token + internal service key + multipart payload
    Core->>CoreDB: Authorize tenant and load encrypted configuration
    Core->>Signit: POST /envelope/create
    Signit-->>Core: Envelope ID
    Core->>Signit: POST /envelope/distribute
    Signit-->>Core: Recipient signing URLs
    Core-->>CG: Envelope ID and validated recipients
    CG->>CGDB: Store envelope, links, audit fields, Sent for Approval
    CG-->>SPA: Updated request
```

The create payload uses sequential signing:

```json
{
  "type": "DOCUMENT",
  "title": "<instrument type> - <beneficiary>",
  "externalId": "<CreditGuard request ID>",
  "recipients": [
    {
      "email": "approver@example.com",
      "name": "Approver Name",
      "role": "APPROVER",
      "signingOrder": 1
    }
  ],
  "meta": {
    "signingOrder": "SEQUENTIAL"
  }
}
```

Status refresh and recall use the same broker boundary:

```mermaid
%%{init: {"themeVariables": {"fontSize": "22px"}, "flowchart": {"useMaxWidth": false}, "sequence": {"useMaxWidth": false}, "state": {"useMaxWidth": false}}}%%
flowchart LR
    Refresh[Refresh action] --> CGRefresh[CreditGuard validates sent request]
    CGRefresh --> CoreGet[Core GET envelope broker]
    CoreGet --> SignitGet[Signit envelope status]
    SignitGet --> Normalize[Normalize recipient states]
    Normalize --> Persist[Update approver status and action date]

    Recall[Admin recall] --> CGLock[CreditGuard locks sent request]
    CGLock --> CoreDelete[Core delete broker]
    CoreDelete --> SignitDelete[Signit envelope delete]
    SignitDelete -->|success true| Restore[Clear envelope and links; restore Reviewed]
```

Both the user's bearer token and a shared `CREDITGUARD_INTERNAL_API_KEY` protect broker calls. Recipient emails are matched exactly before signing links or statuses are persisted.

## 10. Document storage

CreditGuard separates attachment metadata from binary content:

```mermaid
%%{init: {"themeVariables": {"fontSize": "22px"}, "flowchart": {"useMaxWidth": false}, "sequence": {"useMaxWidth": false}, "state": {"useMaxWidth": false}}}%%
flowchart LR
    Upload[PDF or DOCX upload]
    CG[CreditGuard API]
    Metadata[(request_attachments)]
    Provider{Storage provider}
    Local[(Local private directory)]
    Azure[(Private Azure Blob container)]

    Upload --> CG
    CG --> Metadata
    CG --> Provider
    Provider -->|development| Local
    Provider -->|hosted environments| Azure
```

Uploads are validated for type, size, count, request ownership, organisation scope, and workflow mutability. Blob access should use managed identity where available.

## 11. Licensing and sessions

Product access requires an active organisation module allocation and a licensed session. Project-scoped products also require a project allocation.

```mermaid
%%{init: {"themeVariables": {"fontSize": "22px"}, "flowchart": {"useMaxWidth": false}, "sequence": {"useMaxWidth": false}, "state": {"useMaxWidth": false}}}%%
sequenceDiagram
    participant SPA
    participant Core
    participant DB as platform_core

    SPA->>Core: Open product or administration area
    Core->>DB: Validate module, project, role, and seat limit
    Core->>DB: Create session lease with concurrency protection
    Core-->>SPA: Session granted
    loop Every 30 seconds
        SPA->>Core: Heartbeat
        Core->>DB: Renew lease
    end
    SPA->>Core: Final unmount or logout
    Core->>DB: Release lease
```

Seat enforcement and lease cleanup are concurrency-sensitive controls. Failures must remain visible rather than being converted to successful UI state.

## 12. Deployment architecture

Local development uses one PostgreSQL 16 container with three databases. The Azure Bicep template describes the intended service topology:

```mermaid
%%{init: {"themeVariables": {"fontSize": "22px"}, "flowchart": {"useMaxWidth": false}, "sequence": {"useMaxWidth": false}, "state": {"useMaxWidth": false}}}%%
flowchart TB
    Internet[Users and clients]
    Env[Azure Container Apps environment]
    CoreCA[Core container app]
    CGCA[CreditGuard container app]
    PrimeCA[PRIME container app]
    PG[(Azure Database for PostgreSQL<br/>Flexible Server)]
    KV[Azure Key Vault]
    LA[Log Analytics]
    Blob[Azure Blob Storage]

    Internet --> Env
    Env --> CoreCA
    Env --> CGCA
    Env --> PrimeCA
    CoreCA --> PG
    CGCA --> PG
    PrimeCA --> PG
    CoreCA -. secrets .-> KV
    CGCA -. documents .-> Blob
    Env --> LA
```

The current Bicep file is a scaffold: its Container Apps use a Microsoft hello-world placeholder image and expose each service externally. Production deployment requires approved application images, private service trust boundaries, managed identities, secret bindings, network controls, TLS, monitoring, backup, and cost/security review.

## 13. Testing strategy

```mermaid
%%{init: {"themeVariables": {"fontSize": "22px"}, "flowchart": {"useMaxWidth": false}, "sequence": {"useMaxWidth": false}, "state": {"useMaxWidth": false}}}%%
flowchart LR
    Source[TypeScript source]
    Typecheck[Workspace type-checks]
    E2E[Playwright E2E]
    Mocks[Browser-level deterministic mocks]
    Browser[Installed Chrome channel]

    Source --> Typecheck
    Source --> E2E
    Mocks --> E2E
    E2E --> Browser
```

- Workspace type-checks catch contracts within frontend and services.
- Playwright exercises routes, forms, state, network payloads, success paths, and relevant failures.
- Standard E2E tests mock API traffic and do not require PostgreSQL, B2C, Signit, SMTP, or Azure.
- Database migrations and real integrations require separate disposable-environment validation.

## 14. Security boundaries

| Boundary | Control |
| --- | --- |
| Browser to APIs | Bearer authentication; route and DTO validation |
| User to tenant | Active organisation membership and role checks |
| User to product | Module allocation, product role, optional project allocation, session lease |
| CreditGuard to core broker | User bearer token plus shared internal service key |
| Core to Signit | Decrypted tenant credential applied immediately before outbound request |
| Application to database | Separate database ownership per service |
| CreditGuard to documents | Private provider abstraction; no public container assumption |
| Secret storage | Environment/approved secret store; encrypted integration values at rest |

Important constraints:

- Do not expose product services directly without hardening their independent authentication boundary.
- Do not move CreditGuard domain records into `platform_core`.
- Do not trust client-provided organisation, project, product, ownership, role, or workflow fields.
- Do not log tokens, passwords, integration keys, connection strings, or confidential documents.
- Do not assume atomicity across core, CreditGuard, Signit, email, and document storage.

## 15. Design rationale

| Decision | Benefit | Trade-off |
| --- | --- | --- |
| Shared control plane | One source for identity, tenancy, licensing, and navigation | Product workflows depend on core availability |
| Database per product | Strong ownership and reduced accidental coupling | Cross-service workflows need explicit recovery |
| One SPA | Consistent navigation and session experience | Frontend must respect multiple API/error contracts |
| Core integration broker | Browser and external product runtime never receive Signit credentials | Core handles an additional protected integration surface |
| Drizzle migrations | Typed schema and inspectable SQL | Deployment ordering must be managed explicitly |
| Deterministic E2E mocks | Fast and repeatable workflow tests | Real service integration needs an additional test layer |

## 16. Where to look next

| Need | Source |
| --- | --- |
| Setup and commands | [README](../README.md) |
| Routes and business behavior | [Application Logic](APPLICATION_LOGIC.md) |
| Agent security and change policy | [Agent Guidelines](../AGENTS.md) |
| Frontend implementation | `apps/frontend/src` |
| Core implementation | `apps/core-backend/src` |
| Retained product contract reference | [Application Logic](APPLICATION_LOGIC.md) |
| Shared contracts | `packages/shared/src` |
| Database connection settings | `.env.example` |
