import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
    createLocalRepositoryId,
    listLocalRepositoryDirectory,
    sanitizeRepositoryRelativePath,
    scanLocalRepositories,
} from "./localRepos.js";

test("scanLocalRepositories returns top-level local repositories only", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "waelio-local-repos-"));

    try {
        await mkdir(path.join(root, "waelio", "cli", ".git"), { recursive: true });
        await mkdir(path.join(root, "waelio", "siteforge", ".git"), { recursive: true });
        await mkdir(path.join(root, "waelio", "siteforge", ".build", "checkouts", "nested", ".git"), {
            recursive: true,
        });
        await mkdir(path.join(root, "peace2074", "peace2074.com", ".git"), { recursive: true });

        const snapshot = await scanLocalRepositories(root);

        assert.deepEqual(
            snapshot.repositories.map((repository) => repository.relativePath),
            ["peace2074/peace2074.com", "waelio/cli", "waelio/siteforge"],
        );
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test("listLocalRepositoryDirectory returns sanitized directory entries", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "waelio-local-repos-"));

    try {
        const repositoryRoot = path.join(root, "waelio", "cli");
        await mkdir(path.join(repositoryRoot, ".git"), { recursive: true });
        await mkdir(path.join(repositoryRoot, "src"), { recursive: true });
        await writeFile(path.join(repositoryRoot, "README.md"), "# demo\n");
        await writeFile(path.join(repositoryRoot, "src", "index.ts"), "export {};\n");

        const snapshot = await scanLocalRepositories(root);
        const repository = snapshot.repositories[0];

        assert.ok(repository);
        assert.equal(repository?.id, createLocalRepositoryId("waelio/cli"));

        const rootListing = await listLocalRepositoryDirectory(snapshot, repository!.id);
        assert.equal(rootListing.entries[0]?.name, "src");
        assert.equal(rootListing.entries[1]?.name, "README.md");

        const nestedListing = await listLocalRepositoryDirectory(snapshot, repository!.id, "src");
        assert.equal(nestedListing.requestedPath, "src");
        assert.equal(nestedListing.entries[0]?.relativePath, "src/index.ts");

        await assert.rejects(
            () => listLocalRepositoryDirectory(snapshot, repository!.id, "../outside"),
            /Invalid path outside repository/,
        );
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test("sanitizeRepositoryRelativePath normalizes safe paths", () => {
    assert.equal(sanitizeRepositoryRelativePath("src/components"), "src/components");
    assert.equal(sanitizeRepositoryRelativePath("./src/../src/views"), "src/views");
    assert.equal(sanitizeRepositoryRelativePath(""), "");
});
