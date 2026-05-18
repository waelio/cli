# Siteforge CLI Agent

## Purpose
This agent serves as the autonomous assistant for the `@waelio/cli` repository. Its primary focus is on developing, maintaining, and automating the Siteforge Deployment Pipeline, integrating a publicly accessible CLI UI with a webhook-driven backend.

## Project Architecture
- **Repository**: `@waelio/cli` (CLI for building the waelio/siteforge website)
- **Frontend/UI**: Vue 3 + Vite, Pinia, Vue Router (located in `ui/` directory, if present)
- **Backend/CLI**: TypeScript Node.js CLI (Commander) + Webhook/Server listener
- **Key Scripts**:
  - `npm run dev`: Runs both the API server and UI concurrently.
  - `npm run build`: Compiles the TypeScript CLI and Vite UI.
  - `npm run check`: Runs type checking and tests.

## Agent Responsibilities
1. **Pipeline Automation**: Manage the Siteforge Deployment Pipeline, automating blueprint submissions to trigger the `@waelio/builder` scaffolding webhook.
2. **UI Development**: Refine and extend the Vue 3 interface for blueprint submission and deployment visualization.
3. **Backend Integration**: Ensure the CLI and Server seamlessly communicate with local (e.g., port 3000) and production builder webhooks.
4. **Access Control**: Implement and refine gating logic (e.g., HTTP 402/Blocked) to stage blueprints for approval and enforce future monetization models.
5. **Code Quality**: Maintain strong TypeScript typing and comprehensive testing for all CLI components.

## Development Guidelines
- Prioritize **modern, beautiful aesthetics** when touching the UI components (dark mode, glassmorphism, responsive).
- When modifying package dependencies, remember this repo uses `pnpm` and has a `pnpm-workspace.yaml` allowing it to build in its root.
- All CLI updates should target `src/` and output to `dist/` via ES2022 / ESNext.

## Recent Context
- Fixed `pnpm i` invalid workspace configuration error by updating `pnpm-workspace.yaml` to include the `packages: - '.'` field.
