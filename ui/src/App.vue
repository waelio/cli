<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterView, RouterLink } from "vue-router";

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

onMounted(() => {
  const saved = localStorage.getItem("waelio-theme") as Theme | null;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved ?? (prefersDark ? "dark" : "light"));
});
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <h1 class="app-title">waelio/cli</h1>
      <nav class="app-nav">
        <RouterLink to="/">Scaffold</RouterLink>
        <RouterLink to="/public-sites">Public Sites</RouterLink>
        <RouterLink to="/negotiation">Negotiation</RouterLink>
      </nav>
    </div>
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

  <RouterView />
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
.header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}
.app-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--fg);
}
.app-nav {
  display: flex;
  gap: 1rem;
}
.app-nav a {
  color: var(--fg);
  text-decoration: none;
  font-weight: 500;
  opacity: 0.7;
}
.app-nav a.router-link-exact-active {
  opacity: 1;
  text-decoration: underline;
}
.app-nav a:hover {
  opacity: 1;
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
</style>
