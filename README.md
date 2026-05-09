# @waelio/cli

TypeScript CLI + browser UI toolkit for building [`waelio/siteforge`](https://github.com/waelio/siteforge) from the terminal or a local web interface.

Built with **Vite + TypeScript + Vue**.

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

## Install

Run without installing:

```sh
npx @waelio/cli --help
```

Or install globally:

```sh
npm install -g @waelio/cli
```

## CLI commands

### `waelio --help`

Print the top-level help and list all available commands:

```sh
waelio --help
```

### `waelio doctor`

Check that all required tools (`git`, `npm`, `go`) are installed and accessible:

```sh
waelio doctor
```

### `waelio build`

Clone and build the `waelio/siteforge` website:

```sh
waelio build
```

**All options:**

```sh
waelio build \
  --repo https://github.com/waelio/siteforge.git \  # custom repository URL (default: waelio/siteforge)
  --ref  main \                                      # branch, tag, or commit to checkout
  --source ./my-local-siteforge \                    # skip cloning, use an existing checkout
  --workdir ./build-tmp \                            # directory to clone into
  --dry-run                                          # print the plan without running anything
```

**Common examples:**

```sh
# default — clone and build waelio/siteforge
waelio build

# preview what would happen without executing
waelio build --dry-run

# build a specific branch
waelio build --ref feat/new-homepage

# build from a local checkout you already have
waelio build --source ~/Code/GitHub/waelio/siteforge

# clone into a custom directory
waelio build --workdir /tmp/siteforge-build

# build a fork
waelio build --repo https://github.com/yourname/siteforge.git
```

### `waelio ui`

Start the local web UI and API server (browser dashboard with live build logs):

```sh
waelio ui
```

**Options:**

```sh
waelio ui --port 4000   # default port is 3000
```

Open `http://localhost:3000` in your browser after running this.

### `waelio scaffold <blueprint>`

Scaffold a full Next.js (frontend) + NestJS (backend) project from a siteforge blueprint JSON:

```sh
waelio scaffold ./blueprint.json
```

**All options:**

```sh
waelio scaffold ./blueprint.json \
  --out ./sites \   # output root directory (default: siteforge/sites)
  --no-git          # skip git init and the initial commit
```

**Common examples:**

```sh
# scaffold with defaults
waelio scaffold ./blueprint.json

# scaffold into a custom output directory
waelio scaffold ./blueprint.json --out ~/projects/my-site

# scaffold without initialising a git repository
waelio scaffold ./blueprint.json --no-git

# combine options
waelio scaffold ./blueprint.json --out ./sites --no-git
```

The blueprint JSON is produced by siteforge and describes the project name, slug,
pages, features, integrations, locales, roles, brand tones, visual styles,
content models, and SEO focuses. The scaffolder generates both workspaces from
those selections.

## Development

### Install dependencies

```sh
npm install
```

### Run in development

```sh
npm run dev
```

Starts:

- API/build server on `http://localhost:3000`
- Vite UI on `http://localhost:5173`

### Build everything

```sh
npm run build
```

### Run the built server

```sh
npm start
```

### Other scripts

```sh
npm run typecheck   # tsc --noEmit + vue-tsc for the UI
npm test            # run *.test.ts via tsx --test
npm run check       # typecheck + tests
```

## Helper repos surfaced in the UI

- `waelio/ustore` — storage and state patterns
- `waelio/utils` — shared utilities and UI-friendly helpers
- `waelio/waelio-messaging` — future real-time collaboration ideas

## Localization

UI strings are stored as per-locale JSON files under `src/locals/<lang>/<lang>.json`,
with a top-level `src/locals/manifest.json` summarizing the set. The following
locales ship by default:

`ar`, `de`, `en`, `es`, `fr`, `he`, `id`, `it`, `ru`, `sv`, `tr`, `zh`

RTL locales (`ar`, `he`) should be considered when adding or editing UI copy.

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
