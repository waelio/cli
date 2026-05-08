import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const configuredLocalReposRoot = process.env.WAELIO_LOCAL_ROOT?.trim();

export const DEFAULT_LOCAL_REPOS_ROOT = path.resolve(
    configuredLocalReposRoot && configuredLocalReposRoot.length > 0
        ? configuredLocalReposRoot
        : "/Users/waelio/Code/GitHub",
);

const IGNORED_TOP_LEVEL_NAMES = new Set([".DS_Store"]);
const IGNORED_SECOND_LEVEL_NAMES = new Set([".build", ".git", "build", "dist", "node_modules", "tmp"]);
const IGNORED_DIRECTORY_NAMES = new Set([".git"]);

export interface LocalRepositorySummary {
    id: string;
    name: string;
    owner: string;
    relativePath: string;
    absolutePath: string;
}

export interface LocalRepositoriesSnapshot {
    root: string;
    repositories: LocalRepositorySummary[];
}

export interface LocalDirectoryEntry {
    name: string;
    kind: "directory" | "file";
    relativePath: string;
    absolutePath: string;
    hidden: boolean;
}

export interface LocalDirectoryListing {
    repo: LocalRepositorySummary;
    requestedPath: string;
    absolutePath: string;
    entries: LocalDirectoryEntry[];
}

interface DirectoryCandidate {
    name: string;
    absolutePath: string;
}

export async function scanLocalRepositories(root = DEFAULT_LOCAL_REPOS_ROOT): Promise<LocalRepositoriesSnapshot> {
    const resolvedRoot = path.resolve(root);
    const repositories = new Map<string, LocalRepositorySummary>();

    for (const candidate of await readDirectoryCandidates(resolvedRoot, IGNORED_TOP_LEVEL_NAMES)) {
        if (await hasGitMarker(candidate.absolutePath)) {
            const repository = createRepositorySummary(resolvedRoot, candidate.absolutePath);
            repositories.set(repository.relativePath, repository);
            continue;
        }

        for (const nestedCandidate of await readDirectoryCandidates(
            candidate.absolutePath,
            IGNORED_SECOND_LEVEL_NAMES,
        )) {
            if (!(await hasGitMarker(nestedCandidate.absolutePath))) {
                continue;
            }

            const repository = createRepositorySummary(resolvedRoot, nestedCandidate.absolutePath);
            repositories.set(repository.relativePath, repository);
        }
    }

    return {
        root: resolvedRoot,
        repositories: [...repositories.values()].sort((left, right) =>
            left.relativePath.localeCompare(right.relativePath),
        ),
    };
}

export async function listLocalRepositoryDirectory(
    snapshot: LocalRepositoriesSnapshot,
    repositoryId: string,
    requestedPath?: string,
): Promise<LocalDirectoryListing> {
    const repository = snapshot.repositories.find((entry) => entry.id === repositoryId);

    if (!repository) {
        throw new Error(`Unknown local repository id: ${repositoryId}`);
    }

    const sanitizedPath = sanitizeRepositoryRelativePath(requestedPath);
    const targetPath = path.resolve(repository.absolutePath, sanitizedPath);

    if (!isPathInsideRepository(targetPath, repository.absolutePath)) {
        throw new Error(`Invalid path outside repository: ${requestedPath ?? ""}`);
    }

    const details = await stat(targetPath);

    if (!details.isDirectory()) {
        throw new Error(`Requested path is not a directory: ${sanitizedPath}`);
    }

    const dirents = await readdir(targetPath, { withFileTypes: true });
    const entries = dirents
        .filter((entry) => !IGNORED_DIRECTORY_NAMES.has(entry.name))
        .map((entry) => {
            const childRelativePath = sanitizedPath.length > 0 ? path.posix.join(sanitizedPath, entry.name) : entry.name;
            const childAbsolutePath = path.join(targetPath, entry.name);

            return {
                name: entry.name,
                kind: entry.isDirectory() ? "directory" : "file",
                relativePath: childRelativePath,
                absolutePath: childAbsolutePath,
                hidden: entry.name.startsWith("."),
            } satisfies LocalDirectoryEntry;
        })
        .sort((left, right) => {
            if (left.kind !== right.kind) {
                return left.kind === "directory" ? -1 : 1;
            }

            return left.name.localeCompare(right.name);
        });

    return {
        repo: repository,
        requestedPath: sanitizedPath,
        absolutePath: targetPath,
        entries,
    };
}

export function sanitizeRepositoryRelativePath(value?: string): string {
    if (typeof value !== "string") {
        return "";
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
        return "";
    }

    const normalized = path.posix.normalize(trimmed.replace(/\\/g, "/")).replace(/^\/+/, "");

    if (normalized === ".") {
        return "";
    }

    if (normalized === ".." || normalized.startsWith("../") || normalized.includes("/../")) {
        throw new Error(`Invalid path outside repository: ${value}`);
    }

    return normalized;
}

export function createLocalRepositoryId(relativePath: string): string {
    return Buffer.from(relativePath, "utf8").toString("base64url");
}

async function readDirectoryCandidates(directoryPath: string, ignoredNames: Set<string>): Promise<DirectoryCandidate[]> {
    try {
        const dirents = await readdir(directoryPath, { withFileTypes: true });

        return dirents
            .filter((entry) => entry.isDirectory())
            .filter((entry) => !entry.name.startsWith("."))
            .filter((entry) => !ignoredNames.has(entry.name))
            .map((entry) => ({
                name: entry.name,
                absolutePath: path.join(directoryPath, entry.name),
            }));
    } catch {
        return [];
    }
}

async function hasGitMarker(directoryPath: string): Promise<boolean> {
    return pathExists(path.join(directoryPath, ".git"));
}

function createRepositorySummary(root: string, absolutePath: string): LocalRepositorySummary {
    const relativePath = path.relative(root, absolutePath);
    const parts = relativePath.split(path.sep).filter(Boolean);
    const owner = parts.length > 1 ? parts[0] ?? "" : "local";
    const name = parts[parts.length - 1] ?? relativePath;

    return {
        id: createLocalRepositoryId(relativePath),
        name,
        owner,
        relativePath,
        absolutePath,
    };
}

function isPathInsideRepository(targetPath: string, repositoryPath: string): boolean {
    const relative = path.relative(repositoryPath, targetPath);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function pathExists(targetPath: string): Promise<boolean> {
    try {
        await stat(targetPath);
        return true;
    } catch {
        return false;
    }
}
