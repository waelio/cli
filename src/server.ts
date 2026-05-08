import { createServer, type IncomingMessage, type Server as HttpServer, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    DEFAULT_SITEFORGE_REPO,
    formatBuildPlan,
    getDoctorReport,
    prepareBuildPlan,
    runBuild,
    type BuildPlan,
    type BuildSiteforgeOptions,
} from "./siteforge.js";
import {
    DEFAULT_LOCAL_REPOS_ROOT,
    listLocalRepositoryDirectory,
    scanLocalRepositories,
} from "./localRepos.js";

interface HelperRepository {
    name: string;
    url: string;
    description: string;
    suggestedUse: string;
}

interface RecommendedStack {
    name: string;
    reasons: string[];
}

const helperRepositories: HelperRepository[] = [
    {
        name: "waelio/ustore",
        url: "https://github.com/waelio/ustore",
        description: "Universal storage adapters with a clean CRUD-style API.",
        suggestedUse: "Great for caching UI state, history, and future build session persistence.",
    },
    {
        name: "waelio/utils",
        url: "https://github.com/waelio/utils",
        description: "Shared utilities for config, storage, and UI-friendly helpers.",
        suggestedUse: "A good future home for reusable notifications, config helpers, or shared browser utilities.",
    },
    {
        name: "waelio/waelio-messaging",
        url: "https://github.com/waelio/waelio-messaging",
        description: "Realtime messaging and event distribution with FeathersJS and Socket.io.",
        suggestedUse: "Useful later if you want shared build dashboards, collaboration, or remote build notifications.",
    },
];

const recommendedStack: RecommendedStack = {
    name: "Vite + TypeScript + Vue",
    reasons: [
        "Vite keeps the UI extremely fast during local development.",
        "TypeScript matches the existing CLI and build code.",
        "Vue fits well with the broader waelio ecosystem and is quick to iterate on.",
    ],
};

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const uiDistDir = path.join(projectRoot, "ui", "dist");

let buildInProgress = false;

export async function startServer(options: { port?: number } = {}): Promise<HttpServer> {
    const port = options.port ?? Number(process.env.PORT ?? 3000);
    const server = createServer((request, response) => {
        void handleRequest(request, response);
    });

    await new Promise<void>((resolve, reject) => {
        const onError = (error: Error): void => {
            server.off("listening", onListening);
            reject(error);
        };
        const onListening = (): void => {
            server.off("error", onError);
            resolve();
        };

        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(port);
    });

    console.log(`waelio UI server ready on http://localhost:${port}`);

    return server;
}

async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const requestUrl = new URL(request.url ?? "/", "http://localhost");

    try {
        if (request.method === "OPTIONS") {
            sendNoContent(response);
            return;
        }

        if (requestUrl.pathname.startsWith("/api/")) {
            await handleApiRequest(request, response, requestUrl);
            return;
        }

        await handleUiRequest(response, requestUrl.pathname);
    } catch (error) {
        sendJson(response, 500, {
            error: toErrorMessage(error),
        });
    }
}

async function handleApiRequest(
    request: IncomingMessage,
    response: ServerResponse,
    requestUrl: URL,
): Promise<void> {
    if (request.method === "GET" && requestUrl.pathname === "/api/health") {
        sendJson(response, 200, {
            defaultRepoUrl: DEFAULT_SITEFORGE_REPO,
            localReposRoot: DEFAULT_LOCAL_REPOS_ROOT,
            recommendedStack,
            helperRepositories,
        });
        return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/local-repos") {
        const snapshot = await scanLocalRepositories();

        sendJson(response, 200, {
            root: snapshot.root,
            count: snapshot.repositories.length,
            repositories: snapshot.repositories,
        });
        return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/local-repos/tree") {
        const repositoryId = requestUrl.searchParams.get("repoId")?.trim();

        if (!repositoryId) {
            sendJson(response, 400, {
                error: "Missing repoId query parameter.",
            });
            return;
        }

        const snapshot = await scanLocalRepositories();

        try {
            const listing = await listLocalRepositoryDirectory(
                snapshot,
                repositoryId,
                requestUrl.searchParams.get("path") ?? undefined,
            );

            sendJson(response, 200, listing);
        } catch (error) {
            const message = toErrorMessage(error);
            sendJson(response, message.includes("Unknown local repository id") ? 404 : 400, {
                error: message,
            });
        }

        return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/doctor") {
        const checks = await getDoctorReport();
        sendJson(response, 200, { checks });
        return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/plan") {
        const payload = await readJsonBody(request);
        const options = normalizeBuildOptions(payload);
        const plan = await prepareBuildPlan(options);

        sendJson(response, 200, {
            plan,
            formatted: formatBuildPlan(plan),
        });
        return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/build/stream") {
        await handleBuildStream(response, buildOptionsFromSearchParams(requestUrl.searchParams));
        return;
    }

    sendJson(response, 404, {
        error: `Unknown API route: ${requestUrl.pathname}`,
    });
}

async function handleBuildStream(response: ServerResponse, options: BuildSiteforgeOptions): Promise<void> {
    if (buildInProgress) {
        sendJson(response, 409, {
            error: "A build is already running. Please wait for it to finish.",
        });
        return;
    }

    buildInProgress = true;

    response.writeHead(200, {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream; charset=utf-8",
    });

    let clientClosed = false;

    response.on("close", () => {
        clientClosed = true;
    });

    sendSseEvent(response, "ready", {
        message: "Build stream connected.",
    });

    try {
        const plan = await runBuild(options, {
            onPlan: (nextPlan) => {
                sendSseEvent(response, "plan", { plan: nextPlan }, clientClosed);
            },
            onInfo: (message) => {
                sendSseEvent(response, "info", { message }, clientClosed);
            },
            onStepStart: (step, context) => {
                sendSseEvent(
                    response,
                    "step",
                    {
                        step,
                        index: context.index,
                        total: context.total,
                    },
                    clientClosed,
                );
            },
            onStdout: (chunk) => {
                sendSseEvent(response, "stdout", { chunk }, clientClosed);
            },
            onStderr: (chunk) => {
                sendSseEvent(response, "stderr", { chunk }, clientClosed);
            },
        });

        sendSseEvent(response, "complete", { plan }, clientClosed);
    } catch (error) {
        sendSseEvent(
            response,
            "failure",
            {
                message: toErrorMessage(error),
            },
            clientClosed,
        );
    } finally {
        buildInProgress = false;

        if (!clientClosed && !response.writableEnded) {
            response.end();
        }
    }
}

async function handleUiRequest(response: ServerResponse, pathname: string): Promise<void> {
    const uiExists = await pathExists(uiDistDir);

    if (!uiExists) {
        sendHtml(
            response,
            503,
            `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>waelio UI not built yet</title>
    <style>
      body { font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #08111f; color: #e2e8f0; display: grid; place-items: center; min-height: 100vh; margin: 0; }
      main { max-width: 720px; padding: 32px; border-radius: 24px; background: rgba(15, 23, 42, 0.92); box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35); }
      code { background: rgba(148, 163, 184, 0.15); padding: 2px 8px; border-radius: 8px; }
      a { color: #8b5cf6; }
    </style>
  </head>
  <body>
    <main>
      <h1>UI build not found</h1>
      <p>Run <code>npm run dev</code> for development or <code>npm run build</code> followed by <code>npm start</code> for the compiled UI.</p>
      <p>The API is still available at <code>/api/*</code>.</p>
    </main>
  </body>
</html>`,
        );
        return;
    }

    const assetPath = await resolveUiAssetPath(pathname);

    if (!assetPath) {
        sendJson(response, 404, {
            error: `UI asset not found: ${pathname}`,
        });
        return;
    }

    const fileContents = await readFile(assetPath);
    response.writeHead(200, {
        "Content-Type": getContentType(assetPath),
    });
    response.end(fileContents);
}

async function resolveUiAssetPath(pathname: string): Promise<string | null> {
    const normalizedPath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const candidate = path.normalize(path.join(uiDistDir, normalizedPath));

    if (!candidate.startsWith(uiDistDir)) {
        return null;
    }

    if (await pathExists(candidate)) {
        const details = await stat(candidate);
        if (details.isFile()) {
            return candidate;
        }
    }

    if (path.extname(normalizedPath) !== "") {
        return null;
    }

    const indexFile = path.join(uiDistDir, "index.html");
    return (await pathExists(indexFile)) ? indexFile : null;
}

function buildOptionsFromSearchParams(searchParams: URLSearchParams): BuildSiteforgeOptions {
    const dryRunValue = normalizeString(searchParams.get("dryRun"));

    return {
        repoUrl: normalizeString(searchParams.get("repo") ?? searchParams.get("repoUrl")),
        ref: normalizeString(searchParams.get("ref")),
        source: normalizeString(searchParams.get("source")),
        workdir: normalizeString(searchParams.get("workdir")),
        dryRun: dryRunValue === "true",
    };
}

function normalizeBuildOptions(value: unknown): BuildSiteforgeOptions {
    if (!isRecord(value)) {
        return {};
    }

    return {
        repoUrl: normalizeString(value.repoUrl ?? value.repo),
        ref: normalizeString(value.ref),
        source: normalizeString(value.source),
        workdir: normalizeString(value.workdir),
        dryRun: value.dryRun === true,
    };
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];

    for await (const chunk of request) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    if (chunks.length === 0) {
        return {};
    }

    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function sendSseEvent(response: ServerResponse, event: string, data: object, clientClosed = false): void {
    if (clientClosed || response.writableEnded || response.destroyed) {
        return;
    }

    response.write(`event: ${event}\n`);
    response.write(`data: ${JSON.stringify(data)}\n\n`);
}

function sendJson(response: ServerResponse, statusCode: number, payload: object): void {
    response.writeHead(statusCode, {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(payload));
}

function sendHtml(response: ServerResponse, statusCode: number, html: string): void {
    response.writeHead(statusCode, {
        "Content-Type": "text/html; charset=utf-8",
    });
    response.end(html);
}

function sendNoContent(response: ServerResponse): void {
    response.writeHead(204, {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Origin": "*",
    });
    response.end();
}

function getContentType(filePath: string): string {
    switch (path.extname(filePath)) {
        case ".css":
            return "text/css; charset=utf-8";
        case ".html":
            return "text/html; charset=utf-8";
        case ".js":
            return "text/javascript; charset=utf-8";
        case ".json":
            return "application/json; charset=utf-8";
        case ".svg":
            return "image/svg+xml";
        case ".png":
            return "image/png";
        case ".ico":
            return "image/x-icon";
        default:
            return "text/plain; charset=utf-8";
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function normalizeString(value: unknown): string | undefined {
    if (typeof value !== "string") {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

async function pathExists(targetPath: string): Promise<boolean> {
    try {
        await stat(targetPath);
        return true;
    } catch {
        return false;
    }
}

function toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function isDirectRun(): boolean {
    const entryPoint = process.argv[1];
    return Boolean(entryPoint) && path.resolve(entryPoint) === fileURLToPath(import.meta.url);
}

if (isDirectRun()) {
    startServer().catch((error: unknown) => {
        console.error(`\nError: ${toErrorMessage(error)}`);
        process.exitCode = 1;
    });
}
