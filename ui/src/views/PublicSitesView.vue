<script setup lang="ts">
import { ref, onMounted } from "vue";

const sites = ref<string[]>([]);
const error = ref<string>("");
const loading = ref<boolean>(true);

onMounted(async () => {
  try {
    const res = await fetch("/api/public-sites");
    if (!res.ok) {
      throw new Error(`Error: ${res.status}`);
    }
    const data = await res.json();
    sites.value = data.sites || [];
  } catch (err: any) {
    error.value = err.message || "Failed to load public sites";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <main class="app-main">
    <section class="group">
      <h2 class="group-title">Public Sites</h2>
      <div v-if="loading" class="status-msg">Loading...</div>
      <div v-else-if="error" class="error-msg">{{ error }}</div>
      <ul v-else-if="sites.length > 0" class="site-list">
        <li v-for="site in sites" :key="site" class="site-item">
          <a :href="`/public-sites/${site}/`" target="_blank" class="site-link">
            {{ site }}
          </a>
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
.status-msg, .error-msg {
  padding: 1rem 0;
  opacity: 0.8;
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
  padding: 0.75rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.375rem;
  background: rgba(255, 255, 255, 0.03);
  transition: background 0.2s;
}
.site-item:hover {
  background: rgba(255, 255, 255, 0.08);
}
.site-link {
  color: var(--fg);
  text-decoration: none;
  font-weight: 500;
  display: block;
}
.site-link:hover {
  text-decoration: underline;
}
</style>
