<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { emitter } from 'shared/helpers/mitt';
import { BUS_EVENTS } from 'shared/constants/busEvents';
import CandyAiAPI from 'dashboard/api/candyAi';
import Button from 'dashboard/components-next/button/Button.vue';

const props = defineProps({
  conversationId: { type: Number, required: true },
});

const copy = {
  heading: 'CandyAI assist',
  description: 'Review and edit a suggested reply before sending.',
  generate: 'Generate suggestion',
  loading: 'Loading…',
  generating: 'Generating a grounded reply…',
  ariaLabel: 'AI suggested reply',
  insert: 'Insert into reply',
  dismiss: 'Dismiss',
  controlNote: 'Inserting does not send the message. The agent remains in control.',
  failed: 'Suggestion generation failed. Check provider configuration and try again.',
  refreshError: 'Could not refresh the suggestion status.',
  loadError: 'Could not load AI suggestions.',
  generateError: 'Could not generate a suggestion.',
  updateError: 'Could not update the suggestion.',
};

const suggestions = ref([]);
const loading = ref(false);
const requesting = ref(false);
const error = ref('');
const draft = ref('');
let pollTimer;

const latest = computed(() => suggestions.value[0] || null);
const busy = computed(
  () =>
    ['pending', 'generating'].includes(latest.value?.status)
);
const canUse = computed(
  () => latest.value?.status === 'generated' && draft.value.trim().length > 0
);

function replaceLatest(record) {
  suggestions.value = [
    record,
    ...suggestions.value.filter(item => item.id !== record.id),
  ];
  if (record.status === 'generated') draft.value = record.content || '';
}

async function poll(id) {
  clearTimeout(pollTimer);
  pollTimer = setTimeout(async () => {
    try {
      const { data } = await CandyAiAPI.getSuggestion(id);
      replaceLatest(data.suggestion);
      if (['pending', 'generating'].includes(data.suggestion.status)) {
        poll(id);
      }
    } catch {
      error.value = copy.refreshError;
    }
  }, 1500);
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await CandyAiAPI.listSuggestions(props.conversationId);
    suggestions.value = data.suggestions || [];
    if (busy.value) poll(latest.value.id);
    if (latest.value?.status === 'generated') {
      draft.value = latest.value.content || '';
    }
  } catch {
    error.value = copy.loadError;
  } finally {
    loading.value = false;
  }
}

async function requestSuggestion() {
  requesting.value = true;
  error.value = '';
  try {
    const { data } = await CandyAiAPI.createSuggestion(props.conversationId);
    replaceLatest(data.suggestion);
    poll(data.suggestion.id);
  } catch (err) {
    error.value = err.response?.data?.error || copy.generateError;
  } finally {
    requesting.value = false;
  }
}

async function updateSuggestion(status) {
  if (!latest.value) return;
  try {
    await CandyAiAPI.updateSuggestion(latest.value.id, {
      status,
      ...(status === 'accepted' ? { content: draft.value } : {}),
    });
    if (status === 'accepted') {
      emitter.emit(BUS_EVENTS.INSERT_INTO_NORMAL_EDITOR, draft.value);
    }
    replaceLatest({ ...latest.value, status, content: draft.value });
  } catch {
    error.value = copy.updateError;
  }
}

watch(() => props.conversationId, load);
onMounted(load);
onBeforeUnmount(() => clearTimeout(pollTimer));
</script>

<template>
  <section class="border-t border-n-slate-5 bg-n-surface-2 px-4 py-3">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h3 class="text-sm font-medium text-n-slate-12">{{ copy.heading }}</h3>
        <p class="text-xs text-n-slate-11">{{ copy.description }}</p>
      </div>
      <Button
        v-if="!busy && latest?.status !== 'generated'"
        :label="copy.generate"
        sm
        slate
        :is-loading="requesting"
        :disabled="requesting"
        @click="requestSuggestion"
      />
    </div>
    <p v-if="loading" class="mt-2 text-xs text-n-slate-11">
      {{ copy.loading }}
    </p>
    <p v-else-if="busy" class="mt-2 text-xs text-n-slate-11">
      {{ copy.generating }}
    </p>
    <p v-if="error" class="mt-2 text-xs text-n-ruby-11">{{ error }}</p>
    <div v-if="latest?.status === 'generated'" class="mt-3">
      <textarea
        v-model="draft"
        rows="4"
        class="w-full rounded-md border border-n-slate-6 bg-n-surface-1 px-3 py-2 text-sm text-n-slate-12"
        :aria-label="copy.ariaLabel"
      />
      <div class="mt-2 flex gap-2">
        <Button
          :label="copy.insert"
          sm
          :disabled="!canUse"
          @click="updateSuggestion('accepted')"
        />
        <Button
          :label="copy.dismiss"
          sm
          slate
          @click="updateSuggestion('rejected')"
        />
      </div>
      <p class="mt-2 text-xs text-n-slate-10">{{ copy.controlNote }}</p>
    </div>
    <p
      v-else-if="latest?.status === 'failed'"
      class="mt-2 text-xs text-n-ruby-11"
    >
      {{ copy.failed }}
    </p>
  </section>
</template>
