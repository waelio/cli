# @waelio/cli

[![npm version](https://img.shields.io/npm/v/@waelio/cli.svg?style=flat-square&color=cb3837)](https://www.npmjs.com/package/@waelio/cli)
[![license](https://img.shields.io/npm/l/@waelio/cli.svg?style=flat-square)](./LICENSE)
[![node](https://img.shields.io/node/v/@waelio/cli.svg?style=flat-square)](https://nodejs.org)

> TypeScript CLI + browser UI toolkit for building [`waelio/siteforge`](https://github.com/waelio/siteforge) from the terminal or a local web interface.

🔗 **Live demo:** [cli.waelio.workers.dev](https://cli.waelio.workers.dev)

Built with **Vite 8 · TypeScript · Vue 3 · Commander**.

---

## ✨ Features

- 🩺 **Doctor** — checks that required local tools are installed
- 📋 **Dry-run** — previews the build plan before running it
- 🔧 **Build** — clones `waelio/siteforge`, installs deps, and runs the build
- 🏗️ **Scaffold** — generates full Next.js + NestJS projects from a blueprint JSON
- 🖥️ **Browser UI** — a Vue dashboard with live logs, scaffold forms, and public site listings
- 🌐 **12 locales** — `ar` `de` `en` `es` `fr` `he` `id` `it` `ru` `sv` `tr` `zh` (RTL-ready)

---

## 📦 Install

Run without installing:

```sh
npx @waelio/cli --help
```

Or install globally:

```sh
npm install -g @waelio/cli
```

---

## 🚀 CLI Commands

### `waelio --help`

Print the top-level help and list all available commands.

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

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--repo <url>` | Custom repository URL | `waelio/siteforge` |
| `--ref <ref>` | Branch, tag, or commit to checkout | `main` |
| `--source <path>` | Skip cloning, use an existing checkout | — |
| `--workdir <path>` | Directory to clone into | `./tmp` |
| `--dry-run` | Print the plan without running anything | `false` |

**Examples:**

```sh
# default — clone and build waelio/siteforge
waelio build

# preview what would happen without executing
waelio build --dry-run

# build a specific branch
waelio build --ref feat/new-homepage

# build from a local checkout
waelio build --source ~/Code/GitHub/waelio/siteforge

# build a fork
waelio build --repo https://github.com/yourname/siteforge.git
```

### `waelio ui`

Start the local web UI and API server:

```sh
waelio ui
waelio ui --port 4000   # default: 3011
```

Open `http://localhost:3011` in your browser.

**UI Views:**

| View | Description |
|------|-------------|
| **Scaffold** | Form-based generator to produce and deploy Siteforge blueprints |
| **Public Sites** | Dashboard listing scaffolded client sites served via `/api/public-sites` |
| **Negotiation** | Manage 2-AI negotiation sessions (kickoff, auth, status, handoff) via proxied API routes |

### `waelio scaffold <blueprint>`

Scaffold a full Next.js (frontend) + NestJS (backend) project from a Siteforge blueprint JSON:

```sh
waelio scaffold ./blueprint.json
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--out <dir>` | Output root directory | `siteforge/sites` |
| `--no-git` | Skip `git init` and the initial commit | `false` |

**Examples:**

```sh
# scaffold with defaults
waelio scaffold ./blueprint.json

# scaffold into a custom directory
waelio scaffold ./blueprint.json --out ~/projects/my-site

# scaffold without initialising a git repository
waelio scaffold ./blueprint.json --no-git
```

The blueprint JSON describes the project name, slug, pages, features, integrations, locales, roles, brand tones, visual styles, content models, and SEO focuses. The scaffolder generates both workspaces from those selections.

---

## 🏛️ Project Structure

```
@waelio/cli
├── src/
│   ├── index.ts          # CLI entry point (Commander)
│   ├── server.ts         # Express API server
│   ├── siteforge.ts      # Build orchestration
│   ├── scaffold.ts       # Blueprint scaffolder
│   ├── localRepos.ts     # Local repo discovery
│   └── locals/           # i18n locale files (12 languages)
├── ui/
│   ├── src/
│   │   ├── App.vue       # Root Vue component
│   │   └── views/        # ScaffoldView, PublicSitesView
│   └── dist/             # Built static assets
├── templates/            # Multi-framework scaffold templates
├── public-sites/         # Scaffolded demo sites (acme-dental, agent-007, e2e-test-site)
├── wrangler.toml         # Cloudflare Workers deployment config
├── vite.config.ts        # Vite build config
└── package.json
```

---

## 🛠️ Development

### Install dependencies

```sh
pnpm install
```

### Run in development

```sh
pnpm dev
```

Starts concurrently:

- **API server** on `http://localhost:3011`
- **Vite UI** on `http://localhost:5173` (proxies `/api` → `:3011`)

### Build everything

```sh
pnpm run build
```

### Run the production server

```sh
pnpm start
```

### Quality checks

```sh
pnpm run typecheck   # tsc --noEmit + vue-tsc for the UI
pnpm test            # run *.test.ts via tsx --test
pnpm run check       # typecheck + tests
```

---

## ☁️ Deployment

The UI is deployed to **Cloudflare Workers** as a static site.

### Deploy manually

```sh
pnpm run build
npx wrangler deploy
```

The `wrangler.toml` configuration serves the built Vue app from `ui/dist`:

```toml
name = "cli"
compatibility_date = "2024-12-01"

[assets]
directory = "./ui/dist"
```

**Live URL:** [https://cli.waelio.workers.dev](https://cli.waelio.workers.dev)

---

## 🔌 API Endpoints

### Build & Scaffold

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/build` | Trigger a siteforge build |
| `POST` | `/api/scaffold` | Scaffold from a blueprint |
| `GET` | `/api/public-sites` | List scaffolded demo sites |
| `GET` | `/api/negotiate/health` | Check negotiation service health |
| `POST` | `/api/negotiate/kickoff` | Create session + authenticate prompt A + save handoff |
| `POST` | `/api/negotiate/auth` | Authenticate prompt A or prompt B |
| `GET` | `/api/negotiate/status?sessionId=...` | Fetch negotiation session status |
| `GET` | `/api/negotiate/handoff?sessionId=...` | Fetch shared handoff markdown |

### Local Repository Discovery

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/local-repos` | Returns the local repository index |
| `GET` | `/api/local-repos/tree?repoId=...&path=...` | Browse a repo's file tree |

**Safety rules:**

- Repository IDs map to scanned local repos only
- Folder browsing is restricted to paths inside the selected repository
- Path traversal (`..`) is rejected
- `.git` directories are hidden from listings
- Default scan root: `~/Code/GitHub` (override with `WAELIO_LOCAL_ROOT`)

---

## 🌍 Localization

UI strings live in `src/locals/<lang>/<lang>.json` with a top-level `src/locals/manifest.json`.

Supported locales:

`ar` · `de` · `en` · `es` · `fr` · `he` · `id` · `it` · `ru` · `sv` · `tr` · `zh`

> RTL locales (`ar`, `he`) are supported — keep them in mind when editing UI copy.

---

## 📚 Related Packages

| Package | Description |
|---------|-------------|
| [`@waelio/utils`](https://www.npmjs.com/package/@waelio/utils) | Shared utilities and UI helpers |
| [`@waelio/ustore`](https://www.npmjs.com/package/@waelio/ustore) | Universal storage and state patterns |
| [`@waelio/agent`](https://www.npmjs.com/package/@waelio/agent) | AI agent frontend toolkit |
| [`@waelio/sync`](https://www.npmjs.com/package/@waelio/sync) | Real-time sync utilities |

---

## 📄 License

[MIT](./LICENSE) © [Waelio](https://waelio.com)
