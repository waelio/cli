<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";

interface ToolCheckResult {
  tool: string;
  ok: boolean;
  details: string;
}

interface BuildStep {
  title: string;
  command: string;
  args: string[];
  cwd?: string;
}

interface BuildPlan {
  projectDir: string;
  usesExistingSource: boolean;
  requiredTools: string[];
  steps: BuildStep[];
}

interface HelperRepository {
  name: string;
  url: string;
  description: string;
  suggestedUse: string;
}

interface LocalRepositorySummary {
  id: string;
  name: string;
  owner: string;
  relativePath: string;
  absolutePath: string;
}

interface LocalDirectoryEntry {
  name: string;
  kind: "directory" | "file";
  relativePath: string;
  absolutePath: string;
  hidden: boolean;
}

interface LocalDirectoryListing {
  repo: LocalRepositorySummary;
  requestedPath: string;
  absolutePath: string;
  entries: LocalDirectoryEntry[];
}

interface HealthResponse {
  defaultRepoUrl: string;
  helperRepositories: HelperRepository[];
  localReposRoot: string;
  recommendedStack: {
    name: string;
    reasons: string[];
  };
}

interface PlanResponse {
  plan: BuildPlan;
  formatted: string;
}

interface DoctorResponse {
  checks: ToolCheckResult[];
}

interface LocalRepositoriesResponse {
  root: string;
  count: number;
  repositories: LocalRepositorySummary[];
}

interface LogEntry {
  id: number;
  kind: "info" | "stdout" | "stderr" | "step" | "system" | "error";
  text: string;
  timestamp: string;
}

const fallbackDefaultRepoUrl = "https://github.com/waelio/siteforge.git";
const fallbackLocalReposRoot = "/Users/waelio/Code/GitHub";

const form = reactive({
  repoUrl: fallbackDefaultRepoUrl,
  ref: "",
  source: "",
  workdir: "./tmp/siteforge-ui",
  dryRun: false,
});

const helperRepositories = ref<HelperRepository[]>([]);
const recommendedStack = ref<HealthResponse["recommendedStack"] | null>(null);
const localReposRoot = ref(fallbackLocalReposRoot);
const localRepositories = ref<LocalRepositorySummary[]>([]);
const selectedLocalRepoId = ref("");
const localDirectory = ref<LocalDirectoryListing | null>(null);
const doctorResults = ref<ToolCheckResult[]>([]);
const plan = ref<BuildPlan | null>(null);
const formattedPlan = ref("");
const logs = ref<LogEntry[]>([]);
const isLoadingHealth = ref(false);
const isCheckingTools = ref(false);
const isLoadingLocalRepos = ref(false);
const isLoadingLocalDirectory = ref(false);
const isLoadingPlan = ref(false);
const isBuilding = ref(false);
const buildState = ref<"idle" | "running" | "success" | "error">("idle");
const eventSource = ref<EventSource | null>(null);
const logPanel = ref<HTMLElement | null>(null);

const statusText = computed(() => {
  switch (buildState.value) {
    case "running":
      return "Build running";
    case "success":
      return "Build finished";
    case "error":
      return "Build failed";
    default:
      return "Ready";
  }
});

const statusClass = computed(() => `status-${buildState.value}`);
const selectedLocalRepository = computed(
  () => localRepositories.value.find((repository) => repository.id === selectedLocalRepoId.value) ?? null,
);
const localRepoCount = computed(() => localRepositories.value.length);
const canPreview = computed(() => !isLoadingPlan.value && !isBuilding.value);
const canCheckTools = computed(() => !isCheckingTools.value && !isBuilding.value);
const canBuild = computed(() => !isBuilding.value);
const canBrowseLocalParent = computed(() => Boolean(localDirectory.value?.requestedPath));
const localBreadcrumbs = computed(() => {
  if (!localDirectory.value || localDirectory.value.requestedPath.length === 0) {
    return [] as Array<{ label: string; path: string }>;
  }

  const segments = localDirectory.value.requestedPath.split("/").filter(Boolean);
  let currentPath = "";

  return segments.map((segment) => {
    currentPath = currentPath.length > 0 ? `${currentPath}/${segment}` : segment;

    return {
      label: segment,
      path: currentPath,
    };
  });
});

function buildRequestPayload(): Record<string, string | boolean> {
  return {
    repoUrl: form.repoUrl.trim() || fallbackDefaultRepoUrl,
    ref: form.ref.trim(),
    source: form.source.trim(),
    workdir: form.workdir.trim(),
    dryRun: form.dryRun,
  };
}

function createQueryString(): string {
  const payload = buildRequestPayload();
  const searchParams = new URLSearchParams();

  if (typeof payload.repoUrl === "string" && payload.repoUrl.length > 0) {
    searchParams.set("repo", payload.repoUrl);
  }

  if (typeof payload.ref === "string" && payload.ref.length > 0) {
    searchParams.set("ref", payload.ref);
  }

  if (typeof payload.source === "string" && payload.source.length > 0) {
    searchParams.set("source", payload.source);
  }

  if (typeof payload.workdir === "string" && payload.workdir.length > 0) {
    searchParams.set("workdir", payload.workdir);
  }

  if (payload.dryRun === true) {
    searchParams.set("dryRun", "true");
  }

  return searchParams.toString();
}

function addLog(kind: LogEntry["kind"], text: string): void {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  const entries = lines.length > 0 ? lines : [text];

  for (const entry of entries) {
    logs.value.push({
      id: Date.now() + Math.random(),
      kind,
      text: entry,
      timestamp: new Date().toLocaleTimeString(),
    });
  }

  void scrollLogsToBottom();
}

async function scrollLogsToBottom(): Promise<void> {
  await nextTick();
  logPanel.value?.scrollTo({
    top: logPanel.value.scrollHeight,
    behavior: "smooth",
  });
}

function resetLogs(): void {
  logs.value = [];
}

function closeBuildStream(): void {
  eventSource.value?.close();
  eventSource.value = null;
}

async function loadHealth(): Promise<void> {
  isLoadingHealth.value = true;

  try {
    const response = await fetch("/api/health");

    if (!response.ok) {
      throw new Error(`Unable to load UI metadata (${response.status})`);
    }

    const payload = (await response.json()) as HealthResponse;
    helperRepositories.value = payload.helperRepositories;
    recommendedStack.value = payload.recommendedStack;
    localReposRoot.value = payload.localReposRoot;
    form.repoUrl = payload.defaultRepoUrl;
  } catch (error) {
    addLog("error", `Health check failed: ${toErrorMessage(error)}`);
  } finally {
    isLoadingHealth.value = false;
  }
}

async function loadLocalRepositories(): Promise<void> {
  isLoadingLocalRepos.value = true;

  try {
    const response = await fetch("/api/local-repos");

    if (!response.ok) {
      throw new Error(`Local repo scan failed (${response.status})`);
    }

    const payload = (await response.json()) as LocalRepositoriesResponse;
    localReposRoot.value = payload.root;
    localRepositories.value = payload.repositories;
    addLog("system", `Compiled ${payload.count} local repositories from ${payload.root}.`);

    const preferredRepository =
      payload.repositories.find((repository) => repository.id === selectedLocalRepoId.value) ??
      payload.repositories.find((repository) => repository.relativePath === "waelio/cli") ??
      payload.repositories[0];

    if (!preferredRepository) {
      selectedLocalRepoId.value = "";
      localDirectory.value = null;
      return;
    }

    const requestedPath =
      localDirectory.value?.repo.id === preferredRepository.id ? localDirectory.value.requestedPath : "";

    await loadLocalDirectory(preferredRepository.id, requestedPath);
  } catch (error) {
    addLog("error", `Local repo scan failed: ${toErrorMessage(error)}`);
  } finally {
    isLoadingLocalRepos.value = false;
  }
}

async function loadLocalDirectory(repositoryId: string, requestedPath = ""): Promise<void> {
  selectedLocalRepoId.value = repositoryId;
  isLoadingLocalDirectory.value = true;

  try {
    const searchParams = new URLSearchParams({ repoId: repositoryId });

    if (requestedPath.length > 0) {
      searchParams.set("path", requestedPath);
    }

    const response = await fetch(`/api/local-repos/tree?${searchParams.toString()}`);

    if (!response.ok) {
      throw new Error(`Folder browser request failed (${response.status})`);
    }

    localDirectory.value = (await response.json()) as LocalDirectoryListing;
  } catch (error) {
    addLog("error", `Folder browser request failed: ${toErrorMessage(error)}`);
  } finally {
    isLoadingLocalDirectory.value = false;
  }
}

function selectLocalRepository(repositoryId: string): void {
  void loadLocalDirectory(repositoryId);
}

function browseLocalParent(): void {
  if (!localDirectory.value) {
    return;
  }

  const segments = localDirectory.value.requestedPath.split("/").filter(Boolean);
  segments.pop();
  void loadLocalDirectory(localDirectory.value.repo.id, segments.join("/"));
}

function openLocalBreadcrumb(requestedPath: string): void {
  if (!localDirectory.value) {
    return;
  }

  void loadLocalDirectory(localDirectory.value.repo.id, requestedPath);
}

function handleLocalEntryClick(entry: LocalDirectoryEntry): void {
  if (!localDirectory.value) {
    return;
  }

  if (entry.kind === "directory") {
    void loadLocalDirectory(localDirectory.value.repo.id, entry.relativePath);
    return;
  }

  addLog("system", `Selected file: ${entry.absolutePath}`);
}

function useLocalRepositoryAsSource(repository: LocalRepositorySummary): void {
  form.source = repository.absolutePath;
  form.workdir = "";
  addLog("system", `Using local repository as source: ${repository.absolutePath}`);
}

function useLocalDirectoryAsSource(): void {
  if (!localDirectory.value) {
    return;
  }

  form.source = localDirectory.value.absolutePath;
  form.workdir = "";
  addLog("system", `Using local folder as source: ${localDirectory.value.absolutePath}`);
}

async function runDoctor(): Promise<void> {
  isCheckingTools.value = true;

  try {
    const response = await fetch("/api/doctor");

    if (!response.ok) {
      throw new Error(`Tool check failed (${response.status})`);
    }

    const payload = (await response.json()) as DoctorResponse;
    doctorResults.value = payload.checks;
    addLog("system", "Tool check completed.");
  } catch (error) {
    addLog("error", `Tool check failed: ${toErrorMessage(error)}`);
  } finally {
    isCheckingTools.value = false;
  }
}

async function previewPlan(): Promise<void> {
  isLoadingPlan.value = true;

  try {
    const response = await fetch("/api/plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildRequestPayload()),
    });

    if (!response.ok) {
      throw new Error(`Plan request failed (${response.status})`);
    }

    const payload = (await response.json()) as PlanResponse;
    plan.value = payload.plan;
    formattedPlan.value = payload.formatted;
    addLog("system", `Plan ready for ${payload.plan.steps.length} step(s).`);
  } catch (error) {
    addLog("error", `Plan request failed: ${toErrorMessage(error)}`);
  } finally {
    isLoadingPlan.value = false;
  }
}

function startBuild(): void {
  closeBuildStream();
  resetLogs();
  buildState.value = "running";
  isBuilding.value = true;

  const queryString = createQueryString();
  const stream = new EventSource(`/api/build/stream?${queryString}`);
  let completed = false;

  stream.addEventListener("ready", (event) => {
    const payload = parseEventPayload<{ message: string }>(event);
    addLog("system", payload.message);
  });

  stream.addEventListener("plan", (event) => {
    const payload = parseEventPayload<{ plan: BuildPlan }>(event);
    plan.value = payload.plan;
    formattedPlan.value = formatPlan(payload.plan);
    addLog("info", `Plan prepared at ${payload.plan.projectDir}.`);
  });

  stream.addEventListener("info", (event) => {
    const payload = parseEventPayload<{ message: string }>(event);
    addLog("info", payload.message);
  });

  stream.addEventListener("step", (event) => {
    const payload = parseEventPayload<{ step: BuildStep; index: number; total: number }>(event);
    addLog("step", `${payload.index}/${payload.total}: ${payload.step.title}`);
  });

  stream.addEventListener("stdout", (event) => {
    const payload = parseEventPayload<{ chunk: string }>(event);
    addLog("stdout", payload.chunk);
  });

  stream.addEventListener("stderr", (event) => {
    const payload = parseEventPayload<{ chunk: string }>(event);
    addLog("stderr", payload.chunk);
  });

  stream.addEventListener("complete", (event) => {
    const payload = parseEventPayload<{ plan: BuildPlan }>(event);
    completed = true;
    isBuilding.value = false;
    buildState.value = "success";
    plan.value = payload.plan;
    formattedPlan.value = formatPlan(payload.plan);
    addLog("system", `Build finished in ${payload.plan.projectDir}.`);

    if (!payload.plan.usesExistingSource) {
      form.source = payload.plan.projectDir;
      form.workdir = "";
      addLog("system", "The last working directory has been promoted to source for faster reruns.");
    }

    closeBuildStream();
  });

  stream.addEventListener("failure", (event) => {
    const payload = parseEventPayload<{ message: string }>(event);
    completed = true;
    isBuilding.value = false;
    buildState.value = "error";
    addLog("error", payload.message);
    closeBuildStream();
  });

  stream.onerror = () => {
    if (completed) {
      return;
    }

    isBuilding.value = false;
    buildState.value = "error";
    addLog("error", "Build stream disconnected unexpectedly.");
    closeBuildStream();
  };

  eventSource.value = stream;
}

function parseEventPayload<T>(event: Event): T {
  return JSON.parse((event as MessageEvent<string>).data) as T;
}

function formatPlan(nextPlan: BuildPlan): string {
  return [
    `Repository directory: ${nextPlan.projectDir}`,
    `Using existing source: ${nextPlan.usesExistingSource ? "yes" : "no"}`,
    `Required tools: ${nextPlan.requiredTools.join(", ")}`,
    ...nextPlan.steps.map((step, index) => `${index + 1}. ${step.title}`),
  ].join("\n");
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

onMounted(() => {
  void loadHealth();
  void loadLocalRepositories();
});

onBeforeUnmount(() => {
  closeBuildStream();
});
</script>

<template>
  <div class="app-shell">
    <header class="hero panel">
      <div>
        <p class="eyebrow">waelio build control center</p>
        <h1>Build `siteforge` from a proper screen UI</h1>
        <p class="hero-copy">
          Suggested stack: <strong>Vite + TypeScript + Vue</strong>. It is fast, typed, and fits the waelio ecosystem nicely.
          The UI now also compiles a local repo list from your GitHub folder and exposes a sanitized physical folder browser.
        </p>
      </div>

      <div class="status-card" :class="statusClass">
        <span class="status-dot" :class="statusClass"></span>
        <div>
          <p class="status-label">Status</p>
          <strong>{{ statusText }}</strong>
          <p class="status-copy">
            {{ isBuilding ? "Streaming live build output" : "Ready for local browsing, plan, doctor, or build" }}
          </p>
        </div>
      </div>
    </header>

    <section class="grid two-col">
      <article class="panel">
        <p class="eyebrow">recommended stack</p>
        <h2>{{ recommendedStack?.name ?? "Vite + TypeScript + Vue" }}</h2>
        <ul class="bullet-list">
          <li v-for="reason in recommendedStack?.reasons ?? []" :key="reason">
            {{ reason }}
          </li>
        </ul>
      </article>

      <article class="panel">
        <div class="section-heading">
          <div>
            <p class="eyebrow">helper repos</p>
            <h2>Reusable waelio building blocks</h2>
          </div>
          <span v-if="isLoadingHealth" class="muted">Loading…</span>
        </div>

        <div class="repo-grid">
          <a
            v-for="repository in helperRepositories"
            :key="repository.name"
            :href="repository.url"
            class="repo-card"
            target="_blank"
            rel="noreferrer"
          >
            <strong>{{ repository.name }}</strong>
            <p>{{ repository.description }}</p>
            <span>{{ repository.suggestedUse }}</span>
          </a>
        </div>
      </article>
    </section>

    <section class="grid two-col wide-last">
      <article class="panel">
        <div class="section-heading">
          <div>
            <p class="eyebrow">local repositories</p>
            <h2>Compiled local repo list</h2>
          </div>

          <button type="button" class="button ghost slim" :disabled="isLoadingLocalRepos" @click="loadLocalRepositories">
            {{ isLoadingLocalRepos ? "Refreshing…" : "Refresh" }}
          </button>
        </div>

        <p class="field-hint">
          Scanning <code>{{ localReposRoot || fallbackLocalReposRoot }}</code> and surfacing top-level repositories only, so nested build checkouts do not pollute the list.
        </p>

        <div class="summary-grid compact-grid">
          <div class="summary-card">
            <span>Local root</span>
            <strong>{{ localReposRoot || fallbackLocalReposRoot }}</strong>
          </div>
          <div class="summary-card">
            <span>Repositories found</span>
            <strong>{{ localRepoCount }}</strong>
          </div>
          <div class="summary-card">
            <span>Selected repo</span>
            <strong>{{ selectedLocalRepository?.relativePath ?? "None yet" }}</strong>
          </div>
        </div>

        <div v-if="localRepositories.length === 0" class="empty-state">
          No local repositories found yet. Try refreshing the local scan.
        </div>

        <div v-else class="local-repo-list">
          <div
            v-for="repository in localRepositories"
            :key="repository.id"
            class="local-repo-card"
            :class="{ 'local-repo-active': repository.id === selectedLocalRepoId }"
          >
            <button type="button" class="local-repo-select" @click="selectLocalRepository(repository.id)">
              <span class="local-repo-owner">{{ repository.owner }}</span>
              <strong>{{ repository.name }}</strong>
              <p>{{ repository.relativePath }}</p>
              <small>{{ repository.absolutePath }}</small>
            </button>

            <button type="button" class="button ghost slim" @click="useLocalRepositoryAsSource(repository)">
              Use as source
            </button>
          </div>
        </div>
      </article>

      <article class="panel">
        <div class="section-heading">
          <div>
            <p class="eyebrow">sanitized folder browser</p>
            <h2>Physical folder view</h2>
          </div>

          <div class="button-row inline-actions">
            <button
              v-if="selectedLocalRepository"
              type="button"
              class="button ghost slim"
              :disabled="isLoadingLocalDirectory"
              @click="loadLocalDirectory(selectedLocalRepository.id)"
            >
              Root
            </button>
            <button
              type="button"
              class="button ghost slim"
              :disabled="!canBrowseLocalParent || isLoadingLocalDirectory"
              @click="browseLocalParent"
            >
              Up
            </button>
            <button
              type="button"
              class="button ghost slim"
              :disabled="!localDirectory"
              @click="useLocalDirectoryAsSource"
            >
              Use folder as source
            </button>
          </div>
        </div>

        <div v-if="!localDirectory" class="empty-state">
          Select a local repository to browse its physical folder safely.
        </div>

        <template v-else>
          <div class="summary-grid compact-grid">
            <div class="summary-card">
              <span>Repository</span>
              <strong>{{ localDirectory.repo.relativePath }}</strong>
            </div>
            <div class="summary-card">
              <span>Current folder</span>
              <strong>{{ localDirectory.requestedPath || "/" }}</strong>
            </div>
            <div class="summary-card">
              <span>Physical path</span>
              <strong>{{ localDirectory.absolutePath }}</strong>
            </div>
          </div>

          <div class="breadcrumb-row">
            <button type="button" class="crumb-button" @click="openLocalBreadcrumb("")">
              {{ localDirectory.repo.name }}
            </button>
            <template v-for="crumb in localBreadcrumbs" :key="crumb.path">
              <span class="crumb-separator">/</span>
              <button type="button" class="crumb-button" @click="openLocalBreadcrumb(crumb.path)">
                {{ crumb.label }}
              </button>
            </template>
          </div>

          <div v-if="isLoadingLocalDirectory" class="empty-state">Loading folder…</div>

          <div v-else-if="localDirectory.entries.length === 0" class="empty-state">
            This folder is empty.
          </div>

          <div v-else class="directory-list">
            <button
              v-for="entry in localDirectory.entries"
              :key="entry.relativePath"
              type="button"
              class="directory-entry"
              :class="entry.kind === 'directory' ? 'directory-entry-dir' : 'directory-entry-file'"
              @click="handleLocalEntryClick(entry)"
            >
              <span class="directory-icon">{{ entry.kind === "directory" ? "📁" : "📄" }}</span>
              <div class="directory-entry-body">
                <strong>{{ entry.name }}</strong>
                <p>{{ entry.relativePath }}</p>
                <small>{{ entry.absolutePath }}</small>
              </div>
            </button>
          </div>
        </template>
      </article>
    </section>

    <section class="grid two-col">
      <article class="panel">
        <div class="section-heading">
          <div>
            <p class="eyebrow">controls</p>
            <h2>Build options</h2>
          </div>
        </div>

        <form class="form-grid" @submit.prevent="startBuild">
          <label>
            <span>Repository URL</span>
            <input v-model="form.repoUrl" type="url" placeholder="https://github.com/waelio/siteforge.git" />
          </label>

          <label>
            <span>Ref</span>
            <input v-model="form.ref" type="text" placeholder="main, master, v1.2.3, or commit SHA" />
          </label>

          <label>
            <span>Local source path</span>
            <input v-model="form.source" type="text" placeholder="../siteforge" />
          </label>

          <label>
            <span>Workdir</span>
            <input v-model="form.workdir" type="text" placeholder="./tmp/siteforge-ui" />
          </label>

          <label class="toggle-row">
            <input v-model="form.dryRun" type="checkbox" />
            <span>Dry run only</span>
          </label>

          <p class="field-hint">
            Pick a local repo or folder above to populate <code>source</code>. If <code>source</code> is set, the existing checkout is used and <code>workdir</code> is ignored.
          </p>

          <div class="button-row">
            <button type="button" class="button ghost" :disabled="!canCheckTools" @click="runDoctor">
              {{ isCheckingTools ? "Checking…" : "Check tools" }}
            </button>
            <button type="button" class="button ghost" :disabled="!canPreview" @click="previewPlan">
              {{ isLoadingPlan ? "Planning…" : "Preview plan" }}
            </button>
            <button type="submit" class="button primary" :disabled="!canBuild">
              {{ isBuilding ? "Building…" : "Run build" }}
            </button>
          </div>
        </form>
      </article>

      <article class="panel">
        <div class="section-heading">
          <div>
            <p class="eyebrow">doctor</p>
            <h2>Local tool status</h2>
          </div>
        </div>

        <div v-if="doctorResults.length === 0" class="empty-state">
          Run <strong>Check tools</strong> to inspect git, npm, and Go.
        </div>

        <div v-else class="tool-grid">
          <div
            v-for="result in doctorResults"
            :key="result.tool"
            class="tool-card"
            :class="result.ok ? 'tool-ok' : 'tool-fail'"
          >
            <div class="tool-header">
              <strong>{{ result.tool }}</strong>
              <span>{{ result.ok ? "ready" : "missing" }}</span>
            </div>
            <p>{{ result.details }}</p>
          </div>
        </div>
      </article>
    </section>

    <section class="grid two-col wide-last">
      <article class="panel">
        <div class="section-heading">
          <div>
            <p class="eyebrow">plan</p>
            <h2>Build preview</h2>
          </div>
        </div>

        <div v-if="!plan" class="empty-state">
          Preview the build plan to see clone, install, and build steps before execution.
        </div>

        <template v-else>
          <div class="summary-grid compact-grid">
            <div class="summary-card">
              <span>Directory</span>
              <strong>{{ plan.projectDir }}</strong>
            </div>
            <div class="summary-card">
              <span>Existing source</span>
              <strong>{{ plan.usesExistingSource ? "Yes" : "No" }}</strong>
            </div>
            <div class="summary-card">
              <span>Required tools</span>
              <strong>{{ plan.requiredTools.join(", ") }}</strong>
            </div>
          </div>

          <ol class="step-list">
            <li v-for="step in plan.steps" :key="`${step.title}-${step.command}`">
              <strong>{{ step.title }}</strong>
              <span>{{ step.command }} {{ step.args.join(" ") }}</span>
              <small v-if="step.cwd">cwd: {{ step.cwd }}</small>
            </li>
          </ol>

          <pre class="plan-preview">{{ formattedPlan }}</pre>
        </template>
      </article>

      <article class="panel log-panel">
        <div class="section-heading">
          <div>
            <p class="eyebrow">logs</p>
            <h2>Live build output</h2>
          </div>
          <button type="button" class="button ghost slim" @click="resetLogs">Clear</button>
        </div>

        <div ref="logPanel" class="log-console">
          <div v-if="logs.length === 0" class="empty-log">
            Start a build to stream output here in real time.
          </div>

          <div v-for="entry in logs" :key="entry.id" class="log-line" :class="`log-${entry.kind}`">
            <span class="log-time">{{ entry.timestamp }}</span>
            <span class="log-text">{{ entry.text }}</span>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>
