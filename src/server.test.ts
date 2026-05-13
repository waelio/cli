import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { listPublicSites, resolveScaffoldRequestPayload } from "./server.js";

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

test("resolveScaffoldRequestPayload accepts wrapped webhook blueprint payloads", () => {
    const payload = {
        blueprint: {
            projectName: "Agent 008",
            slug: "agent-008",
        },
        outRoot: "/tmp/public-sites",
        initGit: false,
    };

    const result = resolveScaffoldRequestPayload(payload, "/tmp/default-sites");

    assert.equal(result.mode, "scaffold");
    assert.equal(result.request?.blueprint.projectName, "Agent 008");
    assert.equal(result.request?.outRoot, "/tmp/public-sites");
    assert.equal(result.request?.initGit, false);
});

test("resolveScaffoldRequestPayload accepts direct blueprint payloads", () => {
    const payload = {
        $schema: "https://waelio.dev/schemas/blueprint/v1.json",
        projectName: "Agent 009",
        slug: "agent-009",
    };

    const result = resolveScaffoldRequestPayload(payload, "/tmp/default-sites");

    assert.equal(result.mode, "scaffold");
    assert.equal(result.request?.outRoot, "/tmp/default-sites");
    assert.equal(result.request?.initGit, true);
});

test("resolveScaffoldRequestPayload rejects invalid wrapped blueprint payloads", () => {
    const result = resolveScaffoldRequestPayload(
        {
            blueprint: {
                slug: "missing-name",
            },
        },
        "/tmp/default-sites",
    );

    assert.equal(result.mode, "invalid");
    assert.match(result.error ?? "", /non-empty projectName/);
});

test("resolveScaffoldRequestPayload ignores regular build payloads", () => {
    const result = resolveScaffoldRequestPayload(
        {
            repoUrl: "https://github.com/waelio/siteforge.git",
            ref: "main",
        },
        "/tmp/default-sites",
    );

    assert.equal(result.mode, "none");
});