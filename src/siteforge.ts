import { spawn, type StdioOptions } from "node:child_process";
import { mkdtemp, readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const DEFAULT_SITEFORGE_REPO = "https://github.com/waelio/siteforge.git";

const TOOL_VERSION_ARGS: Record<string, string[]> = {
    git: ["--version"],
    npm: ["--version"],
    go: ["version"],
};

export interface BuildSiteforgeOptions {
    repoUrl?: string;
    ref?: string;
    source?: string;
    workdir?: string;
    dryRun?: boolean;
}

export interface BuildStep {
    title: string;
    command: string;
    args: string[];
    cwd?: string;
}

export interface BuildPlan {
    projectDir: string;
    usesExistingSource: boolean;
    requiredTools: string[];
    steps: BuildStep[];
}

export interface ToolCheckResult {
    tool: string;
    ok: boolean;
    details: string;
}

export interface BuildExecutionHooks {
    onPlan?: (plan: BuildPlan) => void;
    onInfo?: (message: string) => void;
    onStepStart?: (step: BuildStep, context: { index: number; total: number }) => void;
    onStdout?: (chunk: string, step: BuildStep) => void;
    onStderr?: (chunk: string, step: BuildStep) => void;
}

export function createBuildPlan(
    options: Omit<BuildSiteforgeOptions, "workdir" | "dryRun"> & { projectDir: string },
): BuildPlan {
    const repoUrl = options.repoUrl ?? DEFAULT_SITEFORGE_REPO;
    const usesExistingSource = Boolean(options.source);
    const requiredTools = new Set<string>(["npm", "go"]);
    const steps: BuildStep[] = [];

    if (!usesExistingSource) {
        requiredTools.add("git");
        steps.push({
            title: "Clone siteforge",
            command: "git",
            args: ["clone", repoUrl, options.projectDir],
        });
    }

    if (options.ref) {
        requiredTools.add("git");
        steps.push({
            title: `Checkout ${options.ref}`,
            command: "git",
            args: ["checkout", options.ref],
            cwd: options.projectDir,
        });
    }

    steps.push(
        {
            title: "Install dependencies",
            command: "npm",
            args: ["ci"],
            cwd: options.projectDir,
        },
        {
            title: "Build website",
            command: "npm",
            args: ["run", "build"],
            cwd: options.projectDir,
        },
    );

    return {
        projectDir: options.projectDir,
        usesExistingSource,
        requiredTools: [...requiredTools],
        steps,
    };
}

export async function getDoctorReport(): Promise<ToolCheckResult[]> {
    return Promise.all(["git", "npm", "go"].map((tool) => checkTool(tool)));
}

export function formatDoctorReport(checks: ToolCheckResult[]): string {
    return checks
        .map((check) => `${check.ok ? "✔" : "✘"} ${check.tool}: ${check.details}`)
        .join("\n");
}

export async function runDoctor(): Promise<ToolCheckResult[]> {
    const checks = await getDoctorReport();
    let hasFailure = false;

    for (const check of checks) {
        if (check.ok) {
            console.log(`✔ ${check.tool}: ${check.details}`);
            continue;
        }

        hasFailure = true;
        console.error(`✘ ${check.tool}: ${check.details}`);
    }

    if (hasFailure) {
        throw new Error("One or more required tools are missing.");
    }

    return checks;
}

export async function prepareBuildPlan(options: BuildSiteforgeOptions): Promise<BuildPlan> {
    const location = await resolveProjectDir(options);

    return createBuildPlan({
        repoUrl: options.repoUrl,
        ref: options.ref,
        source: options.source,
        projectDir: location.projectDir,
    });
}

export async function runBuild(
    options: BuildSiteforgeOptions,
    hooks?: BuildExecutionHooks,
): Promise<BuildPlan> {
    const plan = await prepareBuildPlan(options);

    hooks?.onPlan?.(plan);

    if (options.dryRun) {
        writeInfo("Dry run: planned build steps", hooks);
        writeInfo(formatBuildPlan(plan), hooks);
        return plan;
    }

    await assertRequiredTools(plan.requiredTools);

    for (const [index, step] of plan.steps.entries()) {
        hooks?.onStepStart?.(step, { index: index + 1, total: plan.steps.length });
        writeInfo(`==> ${step.title}`, hooks);

        await runProcess(step.command, step.args, {
            cwd: step.cwd,
            stdio: hooks ? ["ignore", "pipe", "pipe"] : "inherit",
            onStdout: (chunk) => {
                hooks?.onStdout?.(chunk, step);
            },
            onStderr: (chunk) => {
                hooks?.onStderr?.(chunk, step);
            },
        });
    }

    writeInfo("Build completed successfully.", hooks);
    writeInfo(`Working directory: ${plan.projectDir}`, hooks);

    return plan;
}

export function formatBuildPlan(plan: BuildPlan): string {
    return [
        `Repository directory: ${plan.projectDir}`,
        `Using existing source: ${plan.usesExistingSource ? "yes" : "no"}`,
        `Required tools: ${plan.requiredTools.join(", ")}`,
        ...plan.steps.map((step, index) => `${index + 1}. ${step.title}\n   ${formatStep(step)}`),
    ].join("\n");
}

async function resolveProjectDir(
    options: BuildSiteforgeOptions,
): Promise<{ projectDir: string; usesExistingSource: boolean }> {
    if (options.source) {
        const projectDir = path.resolve(options.source);
        await assertExistingDirectory(projectDir, "source");

        return {
            projectDir,
            usesExistingSource: true,
        };
    }

    if (options.workdir) {
        const projectDir = path.resolve(options.workdir);
        await assertCloneTargetIsReady(projectDir);

        return {
            projectDir,
            usesExistingSource: false,
        };
    }

    const projectDir = await mkdtemp(path.join(os.tmpdir(), "waelio-siteforge-"));

    return {
        projectDir,
        usesExistingSource: false,
    };
}

async function assertRequiredTools(tools: string[]): Promise<void> {
    const failures: string[] = [];

    for (const tool of tools) {
        const result = await checkTool(tool);

        if (!result.ok) {
            failures.push(`${tool}: ${result.details}`);
        }
    }

    if (failures.length > 0) {
        throw new Error(`Missing required tools:\n- ${failures.join("\n- ")}`);
    }
}

async function checkTool(tool: string): Promise<ToolCheckResult> {
    const args = TOOL_VERSION_ARGS[tool] ?? ["--version"];

    try {
        const output = await captureProcess(tool, args);

        return {
            tool,
            ok: true,
            details: output.split(/\r?\n/)[0]?.trim() || "available",
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        return {
            tool,
            ok: false,
            details: message,
        };
    }
}

async function assertExistingDirectory(targetPath: string, label: string): Promise<void> {
    let details;

    try {
        details = await stat(targetPath);
    } catch (error) {
        if (isMissingPathError(error)) {
            throw new Error(`The ${label} path does not exist: ${targetPath}`);
        }

        throw error;
    }

    if (!details.isDirectory()) {
        throw new Error(`The ${label} path is not a directory: ${targetPath}`);
    }
}

async function assertCloneTargetIsReady(targetPath: string): Promise<void> {
    try {
        const details = await stat(targetPath);

        if (!details.isDirectory()) {
            throw new Error(`The workdir path exists but is not a directory: ${targetPath}`);
        }

        const entries = await readdir(targetPath);

        if (entries.length > 0) {
            throw new Error(`The workdir path must be empty before cloning: ${targetPath}`);
        }
    } catch (error) {
        if (isMissingPathError(error)) {
            return;
        }

        throw error;
    }
}

function formatStep(step: BuildStep): string {
    const command = [step.command, ...step.args].map(quoteArgument).join(" ");

    if (!step.cwd) {
        return command;
    }

    return `${command} (cwd: ${step.cwd})`;
}

function quoteArgument(value: string): string {
    if (/^[a-zA-Z0-9_./:=@-]+$/.test(value)) {
        return value;
    }

    return JSON.stringify(value);
}

function writeInfo(message: string, hooks?: BuildExecutionHooks): void {
    if (hooks?.onInfo) {
        hooks.onInfo(message);
        return;
    }

    console.log(message);
}

async function captureProcess(command: string, args: string[]): Promise<string> {
    let stdout = "";
    let stderr = "";

    await runProcess(command, args, {
        stdio: ["ignore", "pipe", "pipe"],
        onStdout: (chunk) => {
            stdout += chunk;
        },
        onStderr: (chunk) => {
            stderr += chunk;
        },
    });

    return `${stdout}${stderr}`.trim();
}

function runProcess(
    command: string,
    args: string[],
    options: {
        cwd?: string;
        stdio?: StdioOptions;
        onStdout?: (chunk: string) => void;
        onStderr?: (chunk: string) => void;
    },
): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn(resolveCommand(command), args, {
            cwd: options.cwd,
            stdio: options.stdio ?? "inherit",
        });

        child.stdout?.setEncoding("utf8");
        child.stdout?.on("data", (chunk: string) => {
            options.onStdout?.(chunk);
        });

        child.stderr?.setEncoding("utf8");
        child.stderr?.on("data", (chunk: string) => {
            options.onStderr?.(chunk);
        });

        child.on("error", (error) => {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                reject(new Error(`Command not found: ${command}`));
                return;
            }

            reject(error);
        });

        child.on("close", (code) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(new Error(`Command failed with exit code ${code}: ${formatCommand(command, args)}`));
        });
    });
}

function resolveCommand(command: string): string {
    if (process.platform === "win32" && command === "npm") {
        return "npm.cmd";
    }

    return command;
}

function formatCommand(command: string, args: string[]): string {
    return [command, ...args].map(quoteArgument).join(" ");
}

function isMissingPathError(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}