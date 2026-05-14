<script setup lang="ts">
import { computed, ref } from "vue";

type PromptRole = "prompt_a" | "prompt_b";

const baseUrl = ref("http://127.0.0.1:8000");

const promptAText = ref("Prompt A opens with proposal terms.");
const goal = ref("Reach agreement on scope, budget, and timeline");
const currentBlocker = ref("Awaiting prompt_b response");
const nextExactStep = ref(
  "Submit prompt_b via /sessions/{session_id}/prompts/prompt_b",
);

const sessionId = ref("");
const sharedSecret = ref("");
const selectedRole = ref<PromptRole>("prompt_b");
const promptText = ref("Prompt B responds with a counter-offer.");

const statusPayload = ref<string>("");
const handoffPayload = ref<string>("");
const outputPayload = ref<string>("");
const loading = ref(false);
const error = ref("");

const canKickoff = computed(
  () => promptAText.value.trim() && goal.value.trim(),
);
const canAuth = computed(
  () =>
    sessionId.value.trim() &&
    sharedSecret.value.trim() &&
    promptText.value.trim() &&
    selectedRole.value,
);
const canInspect = computed(() => sessionId.value.trim());

function pretty(payload: unknown): string {
  return JSON.stringify(payload, null, 2);
}

function clearError(): void {
  error.value = "";
}

async function request(
  path: string,
  method = "GET",
  body?: Record<string, unknown>,
): Promise<any> {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload.error ?? payload.detail ?? `Request failed (${response.status})`,
    );
  }

  return payload;
}

async function kickoff(): Promise<void> {
  if (!canKickoff.value) return;
  loading.value = true;
  clearError();

  try {
    const payload = await request("/api/negotiate/kickoff", "POST", {
      baseUrl: baseUrl.value,
      promptText: promptAText.value,
      goal: goal.value,
      currentBlocker: currentBlocker.value,
      nextExactStep: nextExactStep.value,
      pasteReadyInputs: "",
    });

    sessionId.value = payload.session_id ?? "";
    sharedSecret.value = payload.shared_secret ?? "";
    outputPayload.value = pretty(payload);

    await refreshStatus();
    await refreshHandoff();
  } catch (nextError) {
    error.value = (nextError as Error).message;
  } finally {
    loading.value = false;
  }
}

async function authenticate(): Promise<void> {
  if (!canAuth.value) return;
  loading.value = true;
  clearError();

  try {
    const payload = await request("/api/negotiate/auth", "POST", {
      baseUrl: baseUrl.value,
      sessionId: sessionId.value,
      role: selectedRole.value,
      sharedSecret: sharedSecret.value,
      promptText: promptText.value,
    });

    outputPayload.value = pretty(payload);
    await refreshStatus();
    await refreshHandoff();
  } catch (nextError) {
    error.value = (nextError as Error).message;
  } finally {
    loading.value = false;
  }
}

async function refreshStatus(): Promise<void> {
  if (!canInspect.value) return;
  clearError();

  try {
    const query = new URLSearchParams({
      baseUrl: baseUrl.value,
      sessionId: sessionId.value,
    });
    const payload = await request(`/api/negotiate/status?${query.toString()}`);
    statusPayload.value = pretty(payload);
  } catch (nextError) {
    error.value = (nextError as Error).message;
  }
}

async function refreshHandoff(): Promise<void> {
  if (!canInspect.value) return;
  clearError();

  try {
    const query = new URLSearchParams({
      baseUrl: baseUrl.value,
      sessionId: sessionId.value,
    });
    const payload = await request(`/api/negotiate/handoff?${query.toString()}`);
    handoffPayload.value = pretty(payload);
  } catch (nextError) {
    error.value = (nextError as Error).message;
  }
}
</script>

<template>
  <main class="app-main">
    <section class="group wide">
      <h2 class="group-title">Negotiation Workspace</h2>
      <p class="group-caption">
        Run a full 2-AI session (kickoff → prompt auth → status → handoff) from
        this page.
      </p>

      <label class="field">
        <span>Negotiation API base URL</span>
        <input v-model="baseUrl" type="text" autocomplete="off" />
      </label>
    </section>

    <section class="group">
      <h3 class="group-title">1) Kickoff (Prompt A)</h3>
      <label class="field">
        <span>Prompt A text</span>
        <textarea v-model="promptAText" rows="4" />
      </label>
      <label class="field">
        <span>Goal</span>
        <input v-model="goal" type="text" autocomplete="off" />
      </label>
      <label class="field">
        <span>Current blocker</span>
        <input v-model="currentBlocker" type="text" autocomplete="off" />
      </label>
      <label class="field">
        <span>Next exact step</span>
        <input v-model="nextExactStep" type="text" autocomplete="off" />
      </label>
      <button
        type="button"
        class="btn"
        :disabled="loading || !canKickoff"
        @click="kickoff"
      >
        {{ loading ? "Working..." : "Kickoff session" }}
      </button>
    </section>

    <section class="group">
      <h3 class="group-title">2) Authenticate Prompt</h3>
      <label class="field">
        <span>Session ID</span>
        <input v-model="sessionId" type="text" autocomplete="off" />
      </label>
      <label class="field">
        <span>Shared secret</span>
        <input v-model="sharedSecret" type="text" autocomplete="off" />
      </label>
      <label class="field">
        <span>Role</span>
        <select v-model="selectedRole">
          <option value="prompt_a">prompt_a</option>
          <option value="prompt_b">prompt_b</option>
        </select>
      </label>
      <label class="field">
        <span>Prompt text</span>
        <textarea v-model="promptText" rows="4" />
      </label>
      <button
        type="button"
        class="btn"
        :disabled="loading || !canAuth"
        @click="authenticate"
      >
        Authenticate role
      </button>
    </section>

    <section class="group">
      <h3 class="group-title">3) Inspect Session</h3>
      <div class="actions">
        <button
          type="button"
          class="btn"
          :disabled="!canInspect"
          @click="refreshStatus"
        >
          Refresh status
        </button>
        <button
          type="button"
          class="btn"
          :disabled="!canInspect"
          @click="refreshHandoff"
        >
          Refresh handoff
        </button>
      </div>
    </section>

    <section v-if="error" class="group">
      <h3 class="group-title">Error</h3>
      <pre class="preview error">{{ error }}</pre>
    </section>

    <section v-if="outputPayload" class="group">
      <h3 class="group-title">Last response</h3>
      <pre class="preview">{{ outputPayload }}</pre>
    </section>

    <section v-if="statusPayload" class="group">
      <h3 class="group-title">Session status</h3>
      <pre class="preview">{{ statusPayload }}</pre>
    </section>

    <section v-if="handoffPayload" class="group">
      <h3 class="group-title">Handoff</h3>
      <pre class="preview">{{ handoffPayload }}</pre>
    </section>
  </main>
</template>

<style scoped>
.app-main {
  padding: 1.5rem;
  color: var(--fg);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}
.group {
  border: 1px solid var(--fg);
  border-radius: 0.5rem;
  padding: 1rem;
}
.group.wide {
  grid-column: 1 / -1;
}
.group-title {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  font-weight: 600;
}
.group-caption {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
  opacity: 0.8;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.7rem;
}
.field input,
.field textarea,
.field select {
  width: 100%;
  box-sizing: border-box;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--fg);
  border-radius: 0.375rem;
  background: transparent;
  color: var(--fg);
  font: inherit;
}
.actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.btn {
  padding: 0.5rem 0.85rem;
  border: 1px solid var(--fg);
  border-radius: 0.375rem;
  background: transparent;
  color: var(--fg);
  font: inherit;
  cursor: pointer;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.preview {
  margin: 0;
  padding: 0.75rem;
  border: 1px solid var(--fg);
  border-radius: 0.375rem;
  font-size: 0.82rem;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 20rem;
  overflow: auto;
}
.preview.error {
  border-color: #ef4444;
  color: #ef4444;
}
</style>
