# GitHub And Vercel Requirements

This document defines the minimum repository and deployment requirements so the project stays friendly to GitHub workflows and Vercel deployment.

## Goals

- Keep the repository easy to review, branch, and merge through GitHub.
- Keep the app deployable on Vercel without relying on local filesystem state.
- Make environment configuration explicit and reproducible.
- Keep build and runtime behavior predictable across preview and production deployments.

## GitHub-Friendly Requirements

### Repository shape

- Use a standard Git repository with a single app source of truth.
- Keep docs in `docs/`.
- Keep project-specific agent instructions in `.github/agents/`.
- Avoid checking in generated build output.
- Avoid committing secrets, tokens, or private connection strings.

### Branching and review

- Use `main` as the protected production branch.
- Use feature branches for changes.
- Prefer small pull requests with a single concern.
- Require preview validation before merge when UI or deployment behavior changes.

### Expected GitHub files

- `README.md`
- `package.json`
- `tsconfig.json`
- `next.config.*`
- `.gitignore`
- `.env.example`
- `.github/workflows/*.yml` for CI
- `.github/PULL_REQUEST_TEMPLATE.md` if the team wants a standard review checklist

### CI expectations

- Install dependencies.
- Run typecheck.
- Run lint.
- Run tests.
- Build the app.
- Fail fast on missing environment variables or schema mismatches.

## Vercel-Friendly Requirements

### Runtime constraints

- Use Next.js App Router.
- Keep server-only code inside server actions, route handlers, or server modules.
- Do not rely on `fs` for persistent app storage.
- Do not depend on writable local disk in production.
- Treat uploaded files as external object storage artifacts, not repo files.
- Keep database access outside the client bundle.

### Storage requirements

- Database: PostgreSQL reachable from Vercel.
- File storage: Cloudflare R2 or MinIO via HTTP/S3-compatible access.
- Raw measurement uploads must be stored in object storage.
- Parsed measurement data should be stored in PostgreSQL as JSONB or normalized rows.

### Environment variables

Use `.env.example` and mirror these variables in Vercel project settings:

```bash
DATABASE_URL=
DIRECT_DATABASE_URL=
AUTH_SECRET=
AUTH_URL=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_BASE_URL=
MINIO_ENDPOINT=
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET_NAME=
MINIO_PUBLIC_BASE_URL=
NEXT_PUBLIC_APP_NAME=
NEXT_PUBLIC_APP_URL=
```

Notes:

- Use either the R2 group or the MinIO group, not both at once.
- `DATABASE_URL` should be the runtime-safe connection string used by Vercel.
- `DIRECT_DATABASE_URL` can be used for migrations or direct admin access if needed.
- `AUTH_URL` should match the deployed domain for the environment.

### Build requirements

- Build must succeed with no interactive prompts.
- Build must not require local secrets outside environment variables.
- TypeScript must compile cleanly.
- Tailwind and shadcn/ui components must resolve during production build.
- Any image optimization must work with remote storage and remote URLs.

### Preview deployment requirements

- Every pull request should produce a Vercel preview deployment.
- Preview deployment should be enough to verify navigation, auth shell, and UI layout.
- Preview deployment should not require production-only credentials unless absolutely necessary.

## Project Standards For This Repo

### Code and structure

- Use TypeScript everywhere.
- Keep shared types close to the data model.
- Keep business rules in feature modules or server services, not inside page components.
- Use Zod for request and form validation.
- Use Drizzle migrations for database changes.

### Data and reliability

- Store audit logs for sensitive operations.
- Store raw uploads and documents outside the app filesystem.
- Prefer explicit status fields over inferred status from free text.
- Keep health score logic explainable and deterministic.

### Minimum scripts expected later

The app should eventually expose these scripts in `package.json`:

- `dev`
- `build`
- `start`
- `lint`
- `typecheck`
- `test`
- `db:generate`
- `db:migrate`
- `db:push`

## Definition Of Ready

A feature is ready to build when:

- The domain behavior is described in a doc or issue.
- Required database entities are identified.
- Required environment variables are known.
- UI entry points are known.
- Failure states are known.

## Definition Of Done

A feature is done when:

- It builds successfully on Vercel.
- It passes GitHub CI.
- It has no unresolved environment gaps.
- It stores persistent data in PostgreSQL or object storage, not local disk.
- It has enough documentation for another engineer to continue the work.

