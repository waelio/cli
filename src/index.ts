#!/usr/bin/env node

import { Command } from "commander";

import { DEFAULT_SITEFORGE_REPO, runBuild, runDoctor } from "./siteforge.js";
import { scaffold } from "./scaffold.js";

async function main(): Promise<void> {
    const program = new Command();

    program
        .name("waelio")
        .description("Build the waelio/siteforge website from a local checkout or fresh clone")
        .version("0.1.0")
        .showHelpAfterError();

    program
        .command("doctor")
        .description("Check whether git, npm, and Go are installed")
        .action(async () => {
            await runDoctor();
        });

    program
        .command("build")
        .description("Clone and build the waelio/siteforge website")
        .option("--repo <url>", "repository URL to build", DEFAULT_SITEFORGE_REPO)
        .option("--ref <ref>", "branch, tag, or commit to checkout before building")
        .option("--source <path>", "use an existing local siteforge checkout instead of cloning")
        .option("--workdir <path>", "directory to clone into when --source is not provided")
        .option("--dry-run", "print the build plan without executing it", false)
        .action(async (options: {
            repo: string;
            ref?: string;
            source?: string;
            workdir?: string;
            dryRun: boolean;
        }) => {
            await runBuild({
                repoUrl: options.repo,
                ref: options.ref,
                source: options.source,
                workdir: options.workdir,
                dryRun: options.dryRun,
            });
        });

    program
        .command("ui")
        .description("Start the local web UI and API server")
        .option("--port <number>", "port for the local server", "3011")
        .action(async (options: { port: string }) => {
            const { startServer } = await import("./server.js");
            const port = Number(options.port);

            if (!Number.isInteger(port) || port <= 0) {
                throw new Error(`Invalid port: ${options.port}`);
            }

            await startServer({ port });
        });

    program
        .command("scaffold <blueprint>")
        .description(
            "Scaffold a Next.js + NestJS project from a siteforge blueprint JSON",
        )
        .option("--out <dir>", "output root (default: siteforge/sites)")
        .option("--no-git", "skip git init / initial commit")
        .action(
            async (
                blueprint: string,
                options: { out?: string; git: boolean },
            ) => {
                const result = await scaffold({
                    blueprintPath: blueprint,
                    outRoot: options.out,
                    initGit: options.git,
                });
                console.log(
                    `Scaffolded "${result.slug}" (${result.pageCount} pages) at:\n  ${result.outDir}`,
                );
            },
        );

    await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\nError: ${message}`);
    process.exitCode = 1;
});