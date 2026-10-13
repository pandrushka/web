# Web Application Guidance

This is the React, TypeScript, and Vite frontend for the neighborhood store platform. It uses MUI and pnpm and communicates with the separate Rails API in `../api`.

## Setup and checks

```sh
pnpm install
pnpm dev
pnpm lint
pnpm test --run
pnpm build
```

Tests use Vitest, React Testing Library, user-event, and MSW. Prefer behavior-level tests for requested behavior changes.

## Conventions

- Keep components reasonably small and reusable; use existing MUI patterns and the centralized brand theme.
- Design mobile-first and keep Spanish/localization support in mind.
- Keep API calls and auth/session behavior aligned with the Rails API contract. Do not move backend authorization or business rules into the frontend.
- Preserve the existing JWT login/registration, refresh, logout, and email verification behavior unless a task explicitly requests a change.
- Store data must be scoped to the selected store. Frontend checks may improve the experience but never replace backend authorization.
- The current source still includes previous-app onboarding/questionnaire screens. Do not extend that domain as product work unless specifically requested.
- Make narrowly scoped changes and do not implement planned store, product, order, WhatsApp, inventory, or analytics features without a specific request.
