<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";

type Theme = "light" | "dark";

const theme = ref<Theme>("light");

function applyTheme(next: Theme): void {
  theme.value = next;
  document.documentElement.dataset.theme = next;
  localStorage.setItem("waelio-theme", next);
}

function toggleTheme(): void {
  applyTheme(theme.value === "light" ? "dark" : "light");
}

interface OptionGroup {
  key: string;
  title: string;
  required?: string[];
  items: string[];
}

const groups: OptionGroup[] = [
  {
    key: "pages",
    title: "Pages",
    required: ["Contact", "Privacy", "Terms & Conditions", "Login"],
    items: [
      "Home",
      "About",
      "Services",
      "Pricing",
      "Contact",
      "FAQ",
      "Blog",
      "Catalog",
      "Product Detail",
      "Cart",
      "Checkout",
      "Account",
      "Dashboard",
      "Booking",
      "Practitioners",
      "Docs",
      "Login",
      "Privacy",
      "Terms & Conditions",
    ],
  },
  {
    key: "features",
    title: "Features",
    required: [
      "SEO",
      "Authentication",
      "Publishing",
      "Brand Assets",
      "CASL Permissions",
      "Local Database",
      "NativeScript Ready",
    ],
    items: [
      "SEO",
      "Analytics",
      "Authentication",
      "Billing",
      "Search",
      "Booking",
      "Notifications",
      "Customer Portal",
      "Lead Capture",
      "Case Studies",
      "Blog",
      "Payments",
      "Customer Accounts",
      "Knowledge Base",
      "Admin Dashboard",
      "Content Management",
      "Publishing",
      "Brand Assets",
      "CASL Permissions",
      "Local Database",
      "NativeScript Ready",
    ],
  },
  {
    key: "integrations",
    title: "Integrations",
    items: ["Stripe", "CRM", "Email & SMS", "Analytics"],
  },
  {
    key: "locales",
    title: "Locales",
    items: [
      "en",
      "ar",
      "de",
      "es",
      "fr",
      "he",
      "id",
      "it",
      "ru",
      "sv",
      "tr",
      "zh",
    ],
  },
  {
    key: "roles",
    title: "Roles",
    items: [
      "Admin",
      "Editor",
      "Operations",
      "Support",
      "Sales",
      "Reception",
      "Dentist",
      "Hygienist",
    ],
  },
  {
    key: "brandTones",
    title: "Brand tone",
    items: ["Trustworthy", "Bold", "Premium", "Friendly"],
  },
  {
    key: "visualStyles",
    title: "Visual style",
    items: ["Premium Editorial", "Friendly Clinical"],
  },
  {
    key: "contentModels",
    title: "Content model",
    items: ["Service pages + blog", "Catalog + editorial"],
  },
  {
    key: "seoFocuses",
    title: "SEO focus",
    items: ["Local + service intent", "Transactional intent"],
  },
];

const selected = reactive<Record<string, Set<string>>>(
  Object.fromEntries(
    groups.map((g) => [g.key, new Set<string>(g.required ?? [])]),
  ),
);

function toggle(groupKey: string, item: string): void {
  const set = selected[groupKey];
  if (!set) return;
  if (set.has(item)) set.delete(item);
  else set.add(item);
}

function isRequired(group: OptionGroup, item: string): boolean {
  return group.required?.includes(item) ?? false;
}

function isChecked(groupKey: string, item: string): boolean {
  return selected[groupKey]?.has(item) ?? false;
}

const blueprint = ref<string>("");
const showPreview = ref(false);

function generateBlueprint(): void {
  const selections: Record<string, string[]> = {};
  for (const g of groups) {
    selections[`selected${g.key.charAt(0).toUpperCase() + g.key.slice(1)}`] =
      Array.from(selected[g.key] ?? []);
  }
  const out = {
    $schema: "https://waelio.dev/schemas/blueprint/v1.json",
    generator: {
      name: "waelio-cli",
      version: "0.1.0",
      url: "https://github.com/waelio/cli",
    },
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    selections,
  };
  blueprint.value = JSON.stringify(out, null, 2);
  showPreview.value = false;
}

function viewBlueprint(): void {
  if (!blueprint.value) generateBlueprint();
  showPreview.value = true;
}

function downloadBlueprint(): void {
  if (!blueprint.value) generateBlueprint();
  const blob = new Blob([blueprint.value], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "blueprint.json";
  a.click();
  URL.revokeObjectURL(url);
}

const SITEFORGE_URL =
  (import.meta.env.VITE_SITEFORGE_URL as string | undefined) ??
  "https://siteforge.waelio.com";

const buildStatus = ref<
  "idle" | "connecting" | "sending" | "running" | "done" | "error"
>("idle");
const buildLog = ref<string[]>([]);
const buildResult = ref<string>("");

function logBuild(line: string): void {
  buildLog.value.push(`[${new Date().toLocaleTimeString()}] ${line}`);
}

async function buildSite(): Promise<void> {
  if (!blueprint.value) generateBlueprint();
  buildLog.value = [];
  buildResult.value = "";
  buildStatus.value = "sending";

  const url = `${SITEFORGE_URL.replace(/\/$/, "")}/api/generate`;
  logBuild(`POST ${url}`);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: blueprint.value,
    });
    if (!res.ok) {
      const text = await res.text();
      logBuild(`error: ${res.status} ${text}`);
      buildStatus.value = "error";
      return;
    }
    const data = await res.json();
    buildResult.value = JSON.stringify(data, null, 2);
    buildStatus.value = "done";
    logBuild("build completed");
  } catch (err) {
    logBuild(`network error: ${(err as Error).message}`);
    buildStatus.value = "error";
  }
}

function downloadBuildResult(): void {
  if (!buildResult.value) return;
  const blob = new Blob([buildResult.value], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "siteforge-package.json";
  a.click();
  URL.revokeObjectURL(url);
}

onMounted(() => {
  const saved = localStorage.getItem("waelio-theme") as Theme | null;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved ?? (prefersDark ? "dark" : "light"));
});
</script>

<template>
  <header class="app-header">
    <h1 class="app-title">waelio/cli</h1>
    <button
      type="button"
      class="theme-toggle"
      :aria-label="
        theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
      "
      @click="toggleTheme"
    >
      {{ theme === "light" ? "Dark" : "Light" }}
    </button>
  </header>

  <main class="app-main">
    <section
      v-for="group in groups"
      :key="group.key"
      class="group"
      :aria-labelledby="`group-${group.key}`"
    >
      <h2 :id="`group-${group.key}`" class="group-title">{{ group.title }}</h2>
      <ul class="group-list">
        <li v-for="item in group.items" :key="item">
          <label class="check">
            <input
              type="checkbox"
              :checked="isChecked(group.key, item)"
              :disabled="isRequired(group, item)"
              @change="toggle(group.key, item)"
            />
            <span>{{ item }}</span>
            <span v-if="isRequired(group, item)" class="required-tag">
              required
            </span>
          </label>
        </li>
      </ul>
    </section>
  </main>

  <footer class="app-footer">
    <div class="actions">
      <button type="button" class="btn" @click="generateBlueprint">
        Generate
      </button>
      <button
        type="button"
        class="btn"
        :disabled="!blueprint"
        @click="viewBlueprint"
      >
        View
      </button>
      <button
        type="button"
        class="btn"
        :disabled="!blueprint"
        @click="downloadBlueprint"
      >
        Download
      </button>
      <button
        type="button"
        class="btn"
        :disabled="
          buildStatus === 'connecting' ||
          buildStatus === 'sending' ||
          buildStatus === 'running'
        "
        @click="buildSite"
      >
        Build
      </button>
      <button
        type="button"
        class="btn"
        :disabled="!buildResult"
        @click="downloadBuildResult"
      >
        Download package
      </button>
    </div>
    <pre v-if="showPreview && blueprint" class="preview">{{ blueprint }}</pre>
    <section v-if="buildStatus !== 'idle'" class="build-status">
      <p class="build-state">Build: {{ buildStatus }}</p>
      <pre v-if="buildLog.length" class="preview">{{
        buildLog.join("\n")
      }}</pre>
      <pre v-if="buildResult" class="preview">{{ buildResult }}</pre>
    </section>
  </footer>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--fg);
  color: var(--fg);
}
.app-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--fg);
}
.theme-toggle {
  padding: 0.4rem 0.9rem;
  font: inherit;
  color: var(--fg);
  background: transparent;
  border: 1px solid var(--fg);
  border-radius: 0.375rem;
  cursor: pointer;
}
.theme-toggle:hover {
  opacity: 0.75;
}

.app-main {
  padding: 1.5rem;
  color: var(--fg);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.25rem;
}
.group {
  border: 1px solid var(--fg);
  border-radius: 0.5rem;
  padding: 1rem 1.25rem;
}
.group-title {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  font-weight: 600;
}
.group-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.95rem;
}
.check input {
  accent-color: var(--fg);
}
.required-tag {
  margin-left: auto;
  font-size: 0.75rem;
  opacity: 0.65;
}

.app-footer {
  padding: 1.5rem;
  border-top: 1px solid var(--fg);
  color: var(--fg);
}
.actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.btn {
  padding: 0.5rem 1rem;
  font: inherit;
  color: var(--fg);
  background: transparent;
  border: 1px solid var(--fg);
  border-radius: 0.375rem;
  cursor: pointer;
}
.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.btn:hover:not(:disabled) {
  opacity: 0.75;
}
.preview {
  margin-top: 1rem;
  padding: 1rem;
  border: 1px solid var(--fg);
  border-radius: 0.375rem;
  max-height: 24rem;
  overflow: auto;
  font-size: 0.85rem;
  white-space: pre-wrap;
  word-break: break-word;
}
.build-status {
  margin-top: 1.25rem;
}
.build-state {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
