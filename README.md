This is the most stable branch for development from Backend.
# ApexHR Backend

ApexHR is a multi-tenant HR management SaaS platform. This repository is the backend monorepo — it holds every feature pushed from the backend side, built with NestJS, CQRS, Prisma, BullMQ, and Redis.

`dev_staging` is the current, most stable branch and the default target for new work.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Monorepo Structure](#monorepo-structure)
- [Apps](#apps)
- [Core Modules](#core-modules)
- [Shared Packages & Infrastructure](#shared-packages--infrastructure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Running the App](#running-the-app)
- [Testing](#testing)
- [Architecture Notes](#architecture-notes)
- [Contributing](#contributing)

## Overview

ApexHR handles the core HR workflows a growing company needs:

- Multi-tenant authentication and role-based access control (RBAC)
- Department management
- Leave policy configuration, leave requests, and multi-stage approval routing
- Leave balance tracking and accrual
- Team calendar (leave, birthdays, Ghana public holidays)
- Dashboards (stats, request trends, pending approvals, upcoming absences)
- In-app and email notifications, driven by a background job queue

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [NestJS](https://nestjs.com/) |
| Architecture pattern | CQRS (commands, queries, and handlers per module) |
| ORM | [Prisma](https://www.prisma.io/) |
| Database | PostgreSQL (via Prisma migrations) |
| Queue / background jobs | [BullMQ](https://docs.bullmq.io/) |
| Cache | Redis |
| Containerization | Docker / Docker Compose |
| Error tracking | Sentry (via `sentry-tunnel` module) |
| Testing | Jest (unit + e2e) |

## Monorepo Structure

The repo is organized as a Nest monorepo with two deployable apps sharing a common set of domain modules, packages, and infrastructure code.

```
apex-backend/
├── apps/
│   ├── api/            # HTTP API application (controllers, guards, e2e specs)
│   └── worker/         # Background worker application (schedulers, queue processors)
├── modules/            # Shared domain modules used by both apps
├── infrastructure/     # Cross-cutting infrastructure (database, cache, mail, queue)
├── packages/
│   └── common/         # Shared utilities, pagination, guards
├── documentation/       # Project documentation
├── Docker-compose.yaml
├── Dockerfile
├── nest-cli.json
├── package.json
└── tsconfig.json
```

## Apps

### `apps/api`

The main HTTP API. Exposes REST endpoints for every domain module, handles authentication, and runs the full e2e test suite.

Key files:
- `main.ts` — application bootstrap
- `app.module.ts` — root module, wires in all domain modules
- `health.controller.ts` — health check endpoint
- `instrument.ts` — observability/error-tracking setup
- `test-cases/` — unit and e2e specs (auth flows, leave-request flows, fixtures/helpers)

### `apps/worker`

An independently deployable Nest application that runs scheduled jobs and processes background queues, sharing domain modules with the API without pulling in HTTP/auth concerns.

Key files:
- `leave-accrual.scheduler.ts` — monthly/yearly leave balance accrual cron jobs
- `birthday-notification.scheduler.ts` — upcoming birthday notifications
- `leave-request-notification.processor.ts` — BullMQ processor for leave request lifecycle notifications
- `worker.module.ts` / `worker.service.ts` / `worker.controller.ts`

## Core Modules

All domain logic lives under `modules/`, shared between `apps/api` and `apps/worker`.

| Module | Responsibility |
|---|---|
| `auth` | Login, registration (tenant + employee), password reset/change, token refresh, RBAC guards |
| `users` | User CRUD and lookup (by email, name) |
| `tenant` | Tenant management |
| `department` | Department CRUD and staffing stats — migrated to a DDD-layered structure (domain / application / infrastructure / presentation) |
| `LeaveTypeConfiguration/leave-policy` | Leave policy configuration (create, update, toggle active, per-user policy lookup) |
| `leave-request` | Leave request submission and the full approval workflow (team lead → department head → HR), cancellation, comments, conflict detection |
| `leave-balance` | Leave balance reservation, confirmation, and release |
| `leave-notification` | Notification dispatch across the leave request lifecycle (submitted, approved, rejected, cancelled, commented), plus in-app notifications |
| `calendar` | Team calendar: leave requests, birthdays, Ghana public holidays |
| `dashboard` | Dashboard stats, request trends, pending approvals, department-today view, upcoming absences |
| `birthday` | Upcoming birthday queries and notification triggers |
| `audit` | Audit log querying |
| `sentry-tunnel` | Sentry error-reporting tunnel endpoint |

Each CQRS-based module generally follows the pattern: `cqrs/commands`, `cqrs/handlers`, `cqrs/queries` (or `commands` / `queries` / `handlers` at the module root), plus a `dto/` folder and a controller. Modules being migrated to the DDD-layered structure (currently `department`, with more planned) additionally split into `domain/`, `application/`, `infrastructure/`, and `presentation/`.

## Shared Packages & Infrastructure

- `infrastructure/database/prisma` — Prisma schema and migrations
- `infrastructure/cache` — Redis configuration, module, and service
- `infrastructure/mail` — Mail service and templates (password reset, tenant welcome, user welcome, leave notifications)
- `infrastructure/queue` — BullMQ module setup
- `packages/common/pagination` — Shared pagination DTO and throttler guard
- `packages/common/utils` — Shared utilities (age calculation, leave days calculation)

## Getting Started

### Prerequisites

- Node.js (see `node20-installer.msi` / engines field in `package.json` for the required version)
- PostgreSQL
- Redis
- Docker and Docker Compose (recommended for local development)

### Installation

```bash
git clone <repository-url>
cd apex-backend
npm install
npx tsc --noEmit          # confirm clean compile
npx jest --listTests      # confirm Jest can resolve modules
docker compose -f docker/docker-compose.yml up --build   # confirm api + worker boot together
```

<<<<<<< HEAD
## Environment Variables

Create a `.env` file at the repo root. At minimum, the app expects values for:

```env
# Database
DATABASE_URL=

# Auth
JWT_SECRET=
JWT_REFRESH_SECRET=

# Redis
REDIS_HOST=
REDIS_PORT=

# Mail
MAIL_HOST=
MAIL_PORT=
MAIL_USER=
MAIL_PASSWORD=

# Sentry
SENTRY_DSN=
```

> Confirm the exact variable names against `infrastructure/database/prisma/prisma.service.ts`, `infrastructure/cache/redis.config.ts`, `infrastructure/mail/mail.service.ts`, and `apps/api/src/instrument.ts` before deploying, since this list is a starting point rather than an exhaustive one.

## Database

Migrations live in `infrastructure/database/prisma/migrations`. To apply them locally:

```bash
npx prisma migrate dev
npx prisma generate
```

## Running the App

With Docker Compose (runs both `api` and `worker`, plus their dependencies):

```bash
docker compose -f Docker-compose.yaml up --build
```

Without Docker:

```bash
# API
npm run start:dev

# Worker (separate process)
npm run start:worker:dev
```

> Adjust script names to match whatever is currently defined in `package.json`.

## Testing

Unit tests and e2e specs live under `apps/api/src/test-cases`, with fixtures and helpers in `test-cases/support`.

```bash
# Unit tests
npx jest

# A single module's tests
npx jest department

# e2e tests
npx jest --config apps/api/src/test-cases/jest-e2e.json
```

The suite covers auth flows (login, register, password reset/change, logout/refresh) and leave-request flows (happy path, rejection, authorization guards, balance validation, department-scoping, submission by each role).

## Architecture Notes

- **CQRS throughout.** Every module separates commands (writes) from queries (reads), each with a dedicated handler.
- **Migration in progress.** The codebase is being restructured module-by-module into a DDD-layered pattern (`domain/application/infrastructure/presentation`), following a reference structure. `department` has been migrated; others will follow.
- **Two deployables, one codebase.** `apps/api` and `apps/worker` share `modules/` so business logic isn't duplicated between the HTTP-facing API and the background worker.
- **Multi-tenancy.** Tenant scoping runs through auth, department, and leave-request modules; HR routing uses a nullable unique `hrDepartmentId` on the `Tenant` model to route approvals to the correct HR admin.

## Contributing

- `dev_staging` is the current, most stable branch — base new feature branches from it.
- Add or update tests under `apps/api/src/test-cases` for any change to `auth` or `leave-request` flows, since those are covered by the existing e2e suite.
- Run `npx jest --listTests` after any restructuring work to confirm module resolution (`@infra`, `@common`, `modules/...` aliases) before opening a PR.
=======
## Relationship to `dev_staging`

`dev_staging` remains the stable branch feature work ships from. This branch is a structural refactor running in parallel — it doesn't add new features, and modules not yet migrated to the DDD-layered structure keep working exactly as they do on `dev_staging`. Merge back once a full module-by-module pass is complete and the Jest resolution issue above is confirmed fixed.
>>>>>>> 88b077bdf6370a4eb112a61a56345d4ab888806c
