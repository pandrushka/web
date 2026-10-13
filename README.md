# Web Application

React, TypeScript, Vite, and MUI frontend for a commerce platform serving small neighborhood stores in Nicaragua. The web app is the first target; mobile app support is planned.

## Setup

Requires Node.js and pnpm. From this directory:

```sh
pnpm install
cp .env.example .env.local
pnpm dev
```

Set `VITE_API_BASE_URL` in `.env.local` to the Rails API URL. The development default is `http://localhost:3000`.

## Checks

```sh
pnpm lint
pnpm test --run
pnpm build
```

## Current behavior

The frontend has JWT-based login and registration, session refresh, email verification states, and existing onboarding/questionnaire screens. Preserve the working authentication behavior unless a task specifically requests a change. The questionnaire flow belongs to the previous application and is transitional while the product is converted.

For project direction and engineering constraints, see [../../docs/project.md](../../docs/project.md) and [AGENTS.md](AGENTS.md).
