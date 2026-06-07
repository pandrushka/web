# Web

React + Vite frontend for Matchcraft.

## Stack

- React
- TypeScript
- Vite
- MUI
- pnpm

## Setup

Install dependencies:

```sh
pnpm install
```

Configure the API base URL:

```sh
cp .env.example .env.local
```

Default:

```text
VITE_API_BASE_URL=http://localhost:3000
```

Run the dev server:

```sh
pnpm dev
```

## Checks

```sh
pnpm lint
pnpm build
```

## API Flow

The app currently calls the Rails API for:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/onboarding/questions`
- `POST /api/v1/onboarding/answers`

Access tokens are held in memory for this first prototype.
