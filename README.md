# waelio CLI + UI

TypeScript toolkit for building [`waelio/siteforge`](https://github.com/waelio/siteforge) from either the terminal or a browser UI.

## Recommended UI stack

This repo now uses **Vite + TypeScript + Vue** for the on-screen UI.

Why this stack fits well here:

- **Vite** keeps development fast
- **TypeScript** matches the rest of the repo and the build pipeline
- **Vue** fits naturally with the broader waelio ecosystem and is quick to iterate on

## What it does

- checks that required local tools are installed
- previews the build plan before running it
- clones `waelio/siteforge` into a working directory
- installs dependencies with `npm ci`
- runs `npm run build`
- shows the full workflow in a browser UI with live logs

## Requirements

- Node.js 20+
- npm
- git
- Go

## Install dependencies

```sh
npm install
```

## Run the UI in development

```sh
npm run dev
```

That starts:

- the API/build server on `http://localhost:3000`
- the Vite UI on `http://localhost:5173`

## Build everything

```sh
npm run build
```

## Run the built UI + API server

```sh
npm start
```

## CLI commands

### Check prerequisites

```sh
node dist/index.js doctor
```

### Build `siteforge`

```sh
node dist/index.js build
```

### Preview the build plan without executing it

```sh
node dist/index.js build --dry-run
```

### Start the local UI/API server from the CLI

```sh
node dist/index.js ui --port 3000
```

## Helper repos surfaced in the UI

- `waelio/ustore` — storage and state patterns
- `waelio/utils` — shared utilities and UI-friendly helpers
- `waelio/waelio-messaging` — future real-time collaboration ideas

## Local repository discovery

The UI and API now scan your local GitHub workspace and build a sanitized repository index.

- default local root: `/Users/waelio/Code/GitHub`
- override with `WAELIO_LOCAL_ROOT`
- top-level repositories are included
- nested build/checkouts such as `.build`, `node_modules`, `dist`, and `.git` internals are excluded from discovery

### Local repo API

- `GET /api/local-repos` — returns the compiled local repository list
- `GET /api/local-repos/tree?repoId=...&path=...` — returns a sanitized physical folder listing for a selected local repository

### Safety rules

- repository IDs map to scanned local repos only
- folder browsing is restricted to paths inside the selected repository
- path traversal such as `..` is rejected
- `.git` directories are hidden from the served listing

## Notes

- The default repository URL is `https://github.com/waelio/siteforge.git`.
- A custom workdir can be used when you want a persistent local checkout.
- If `source` is provided, cloning is skipped and the existing checkout is built directly.
