# AGENTS.md

Guidance for Codex and other coding agents working in this React web app.

## App Summary

This is the frontend for the app. It is a Vite + React + TypeScript app using MUI.

- Separate from the Rails API in `../api`
- Uses MUI for UI and theming
- Uses Vitest, React Testing Library, user-event, and MSW
- Browser auth state is persisted in localStorage and restored with the API refresh endpoint

## Setup

Use pnpm.

```sh
pnpm install
pnpm dev
```

## Tests

Run lint, unit tests, and build:

```sh
pnpm lint
pnpm test --run
pnpm build
```

## Frontend Conventions

- Keep the app component-driven.
- Use MUI primitives and the existing brand theme.
- Prefer small, focused components over monolithic screens.
- Keep authenticated users on the dashboard unless they navigate elsewhere.
- Keep admin questionnaire editing hidden from non-super-admins.
- Keep requests and session behavior aligned with the Rails API contracts.

## Auth And Session

- Auth login/register returns `user`, `access_token`, and `refresh_token`.
- Store auth state in localStorage.
- Use `/api/v1/auth/refresh` to restore sessions.
- Clear stored auth state on logout.

## Coding Conventions

- Keep changes narrowly scoped.
- Add tests for new behaviors.
- Prefer behavior-level tests with RTL and API mocking with MSW.
- Do not add backend-specific concerns here.
