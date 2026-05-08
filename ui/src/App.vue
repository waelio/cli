<script setup lang="ts">
import { onMounted, ref } from "vue";

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
</template>

<style scoped>
.theme-toggle {
  position: fixed;
  top: 1rem;
  right: 1rem;
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
