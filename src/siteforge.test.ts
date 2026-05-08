import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_SITEFORGE_REPO, createBuildPlan, formatBuildPlan, formatDoctorReport } from "./siteforge.js";

test("createBuildPlan clones and builds when no source path is provided", () => {
    const plan = createBuildPlan({
        repoUrl: DEFAULT_SITEFORGE_REPO,
        projectDir: "/tmp/siteforge-build",
    });

    assert.equal(plan.projectDir, "/tmp/siteforge-build");
    assert.equal(plan.usesExistingSource, false);
    assert.deepEqual(plan.requiredTools, ["npm", "go", "git"]);
    assert.equal(plan.steps.length, 3);
    assert.equal(plan.steps[0]?.command, "git");
    assert.deepEqual(plan.steps[0]?.args, ["clone", DEFAULT_SITEFORGE_REPO, "/tmp/siteforge-build"]);
    assert.equal(plan.steps[1]?.command, "npm");
    assert.deepEqual(plan.steps[1]?.args, ["ci"]);
    assert.equal(plan.steps[2]?.command, "npm");
    assert.deepEqual(plan.steps[2]?.args, ["run", "build"]);
});

test("createBuildPlan skips clone when a source path is provided", () => {
    const plan = createBuildPlan({
        repoUrl: DEFAULT_SITEFORGE_REPO,
        source: "../siteforge",
        ref: "main",
        projectDir: "/tmp/existing-siteforge",
    });

    assert.equal(plan.usesExistingSource, true);
    assert.equal(plan.steps.length, 3);
    assert.equal(plan.steps[0]?.command, "git");
    assert.deepEqual(plan.steps[0]?.args, ["checkout", "main"]);
    assert.equal(plan.steps[0]?.cwd, "/tmp/existing-siteforge");
    assert.deepEqual(plan.steps[1]?.args, ["ci"]);
    assert.deepEqual(plan.steps[2]?.args, ["run", "build"]);
});

test("formatBuildPlan renders the planned steps", () => {
    const plan = createBuildPlan({
        repoUrl: DEFAULT_SITEFORGE_REPO,
        projectDir: "/tmp/siteforge-build",
    });

    const output = formatBuildPlan(plan);

    assert.match(output, /Repository directory: \/tmp\/siteforge-build/);
    assert.match(output, /1\. Clone siteforge/);
    assert.match(output, /2\. Install dependencies/);
    assert.match(output, /3\. Build website/);
});

test("formatDoctorReport renders success and failure rows", () => {
    const output = formatDoctorReport([
        { tool: "git", ok: true, details: "git version 2.x" },
        { tool: "go", ok: false, details: "Command not found: go" },
    ]);

    assert.match(output, /✔ git: git version 2\.x/);
    assert.match(output, /✘ go: Command not found: go/);
});