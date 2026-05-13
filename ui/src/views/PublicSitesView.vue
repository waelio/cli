<script setup lang="ts">
import { ref, onMounted } from "vue";

const sites = ref<string[]>([]);
const error = ref<string>("");
const loading = ref<boolean>(true);
const serviceStatus = ref<"checking" | "online" | "offline">("checking");
const siteStatus = ref<Record<string, "checking" | "online" | "offline">>({});

function initSiteStatus(nextSites: string[]): void {
  const next: Record<string, "checking" | "online" | "offline"> = {};
  for (const site of nextSites) {
    next[site] = "checking";
  }
  siteStatus.value = next;
}

async function checkSite(site: string): Promise<void> {
  try {
    const res = await fetch(`/public-sites/${encodeURIComponent(site)}/`, {
      cache: "no-store",
      redirect: "manual",
    });
    siteStatus.value[site] =
      res.ok || res.status === 302 ? "online" : "offline";
  } catch {
    siteStatus.value[site] = "offline";
  }
}

const onlineCount = (): number =>
  Object.values(siteStatus.value).filter((state) => state === "online").length;

async function loadSites(): Promise<void> {
  loading.value = true;
  error.value = "";
  serviceStatus.value = "checking";
  try {
    const res = await fetch("/api/public-sites", { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Error: ${res.status}`);
    }
    serviceStatus.value = "online";
    const data = await res.json();
    const nextSites: string[] = data.sites || [];
    sites.value = nextSites;
    initSiteStatus(nextSites);
    await Promise.all(nextSites.map((site) => checkSite(site)));
  } catch (err: any) {
    serviceStatus.value = "offline";
    error.value = err.message || "Failed to load public sites";
  } finally {
    loading.value = false;
  }
}

onMounted(loadSites);
</script>

<template>
  <main class="app-main">
    <section class="group">
      <div class="group-head">
        <h2 class="group-title">Public Sites</h2>
        <button
          type="button"
          class="refresh-btn"
          :disabled="loading"
          @click="loadSites"
        >
          {{ loading ? "Refreshing..." : "Refresh" }}
        </button>
      </div>
      <div class="summary-row">
        <span class="pill" :class="`is-${serviceStatus}`">
          Service: {{ serviceStatus }}
        </span>
        <span class="pill"> Sites: {{ sites.length }} </span>
        <span class="pill"> Online: {{ onlineCount() }} </span>
      </div>
      <div v-if="loading" class="status-msg">Loading...</div>
      <div v-else-if="error" class="error-msg">{{ error }}</div>
      <ul v-else-if="sites.length > 0" class="site-list">
        <li v-for="site in sites" :key="site" class="site-item">
          <span
            class="site-dot"
            :class="`is-${siteStatus[site] || 'checking'}`"
          />
          <a :href="`/public-sites/${site}/`" target="_blank" class="site-link">
            {{ site }}
          </a>
          <span class="site-state">{{ siteStatus[site] || "checking" }}</span>
        </li>
      </ul>
      <div v-else class="status-msg">No public sites found.</div>
    </section>
  </main>
</template>

<style scoped>
.app-main {
  padding: 1.5rem;
  color: var(--fg);
}
.group {
  border: 1px solid var(--fg);
  border-radius: 0.5rem;
  padding: 1rem 1.25rem;
  max-width: 800px;
  margin: 0 auto;
}
.group-title {
  margin: 0 0 1rem;
  font-size: 1.25rem;
  font-weight: 600;
}
.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.group-head .group-title {
  margin: 0;
}
.refresh-btn {
  border: 1px solid var(--fg);
  background: transparent;
  color: var(--fg);
  padding: 0.35rem 0.65rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font: inherit;
}
.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.status-msg,
.error-msg {
  padding: 1rem 0;
  opacity: 0.8;
}
.summary-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.8rem;
  flex-wrap: wrap;
}
.pill {
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 999px;
  padding: 0.18rem 0.6rem;
  font-size: 0.8rem;
  opacity: 0.95;
}
.pill.is-online {
  border-color: #22c55e;
  color: #22c55e;
}
.pill.is-offline {
  border-color: #ef4444;
  color: #ef4444;
}
.pill.is-checking {
  border-color: #f59e0b;
  color: #f59e0b;
}
.error-msg {
  color: #ef4444;
}
.site-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.site-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.75rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.375rem;
  background: rgba(255, 255, 255, 0.03);
  transition: background 0.2s;
}
.site-dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  background: #f59e0b;
  flex: 0 0 auto;
}
.site-dot.is-online {
  background: #22c55e;
}
.site-dot.is-offline {
  background: #ef4444;
}
.site-item:hover {
  background: rgba(255, 255, 255, 0.08);
}
.site-link {
  color: var(--fg);
  text-decoration: none;
  font-weight: 500;
  display: block;
  flex: 1;
}
.site-link:hover {
  text-decoration: underline;
}
.site-state {
  font-size: 0.78rem;
  opacity: 0.8;
  text-transform: capitalize;
}
</style>
