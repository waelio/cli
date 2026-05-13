import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { listPublicSites } from "./server.js";

test("listPublicSites returns only browseable public sites", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "waelio-public-sites-"));

    try {
        await mkdir(path.join(root, "acme-dental"), { recursive: true });
        await writeFile(path.join(root, "acme-dental", "index.html"), "<h1>Acme Dental</h1>\n");

        await mkdir(path.join(root, "agent-007", "frontend"), { recursive: true });
        await writeFile(path.join(root, "agent-007", "README.md"), "# Agent 007\n");

        await writeFile(path.join(root, "notes.txt"), "not a site\n");

        const sites = await listPublicSites(root);

        assert.deepEqual(sites, ["acme-dental"]);
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test("listPublicSites sorts browseable site names", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "waelio-public-sites-"));

    try {
        await mkdir(path.join(root, "zeta-site"), { recursive: true });
        await writeFile(path.join(root, "zeta-site", "index.html"), "<h1>Zeta</h1>\n");

        await mkdir(path.join(root, "alpha-site"), { recursive: true });
        await writeFile(path.join(root, "alpha-site", "index.html"), "<h1>Alpha</h1>\n");

        const sites = await listPublicSites(root);

        assert.deepEqual(sites, ["alpha-site", "zeta-site"]);
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});