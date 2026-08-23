<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { emitter } from 'shared/helpers/mitt';
import { BUS_EVENTS } from 'shared/constants/busEvents';
import CandyAiAPI from 'dashboard/api/candyAi';
import Button from 'dashboard/components-next/button/Button.vue';

const props = defineProps({
  conversationId: { type: Number, required: true },
  messageId: { type: Number, default: null },
});

const { t } = useI18n();
const suggestions = ref([]);
const isLoading = ref(false);
const isRequesting = ref(false);
const error = ref('');
const editingId = ref(null);
const editedContent = ref('');
let pollTimeout = null;

const latestSuggestion = computed(() => suggestions.value[0] || null);
const isBusy = computed(() =>
  ['pending', 'generating'].includes(latestSuggestion.value?.status)
);
const isEditable = computed(
  () => latestSuggestion.value?.status === 'generated'
);

// Maps a provider failure category to a human-friendly, non-leaky message.
const failureMessage = computed(() => {
  const category = latestSuggestion.value?.failure_category;
  if (latestSuggestion.value?.status !== 'failed' || !category) return '';
  if (category === 'quality') return t('CONVERSATION.CANDY_AI.QUALITY_FAILED');
  if (['unavailable', 'timeout'].includes(category))
    return t('CONVERSATION.CANDY_AI.UNAVAILABLE');
  return t('CONVERSATION.CANDY_AI.FAILED');
});

const intelligence = computed(() => latestSuggestion.value?.intelligence || {});

const setSuggestions = nextSuggestions => {
  suggestions.value = nextSuggestions.map(suggestion => ({ ...suggestion }));
  if (isEditable.value && editingId.value !== latestSuggestion.value.id) {
    editedContent.value = latestSuggestion.value.content || '';
  }
};

function pollSuggestion(id) {
  clearTimeout(pollTimeout);
  pollTimeout = setTimeout(async () => {
    try {
      const response = await CandyAiAPI.getSuggestion(id);
      const refreshed = response.data.suggestion;
      setSuggestions([
        refreshed,
        ...suggestions.value.filter(suggestion => suggestion.id !== id),
      ]);
      if (['pending', 'generating'].includes(refreshed.status)) {
        pollSuggestion(id);
      }
    } catch (requestError) {
      error.value = t('CONVERSATION.CANDY_AI.ERRORS.STATUS');
    }
  }, 1500);
}

const fetchSuggestions = async () => {
  isLoading.value = true;
  error.value = '';
  try {
    const response = await CandyAiAPI.listSuggestions(props.conversationId);
    setSuggestions(response.data.suggestions || []);
    if (isBusy.value) pollSuggestion(latestSuggestion.value.id);
  } catch (requestError) {
    error.value = t('CONVERSATION.CANDY_AI.ERRORS.LOAD');
  } finally {
    isLoading.value = false;
  }
};

const requestSuggestion = async () => {
  isRequesting.value = true;
  error.value = '';
  try {
    const response = await CandyAiAPI.createSuggestion(
      props.conversationId,
      props.messageId
    );
    setSuggestions([
      response.data.suggestion,
      ...suggestions.value.filter(
        suggestion => suggestion.id !== response.data.suggestion.id
      ),
    ]);
    pollSuggestion(response.data.suggestion.id);
  } catch (requestError) {
    error.value =
      requestError.response?.data?.error ||
      t('CONVERSATION.CANDY_AI.ERRORS.GENERATE');
  } finally {
    isRequesting.value = false;
  }
};

const acceptSuggestion = async () => {
  if (!latestSuggestion.value || !editedContent.value.trim()) return;

  try {
    await CandyAiAPI.updateSuggestion(latestSuggestion.value.id, {
      status: 'accepted',
      content: editedContent.value,
    });
    // Assist Mode never sends automatically: the agent inserts the text into
    // the composer and decides whether to send it.
    emitter.emit(BUS_EVENTS.INSERT_INTO_NORMAL_EDITOR, editedContent.value);
    setSuggestions([
      {
        ...latestSuggestion.value,
        status: 'accepted',
        content: editedContent.value,
      },
      ...suggestions.value.slice(1),
    ]);
  } catch (requestError) {
    error.value = t('CONVERSATION.CANDY_AI.ERRORS.UPDATE');
  }
};

const rejectSuggestion = async () => {
  if (!latestSuggestion.value) return;

  try {
    await CandyAiAPI.updateSuggestion(latestSuggestion.value.id, {
      status: 'rejected',
    });
    setSuggestions([
      { ...latestSuggestion.value, status: 'rejected' },
      ...suggestions.value.slice(1),
    ]);
  } catch (requestError) {
    error.value = t('CONVERSATION.CANDY_AI.ERRORS.UPDATE');
  }
};

const regenerateSuggestion = async () => {
  if (!latestSuggestion.value) return;

  isRequesting.value = true;
  error.value = '';
  try {
    const response = await CandyAiAPI.regenerateSuggestion(
      latestSuggestion.value.id
    );
    setSuggestions([response.data.suggestion, ...suggestions.value]);
    pollSuggestion(response.data.suggestion.id);
  } catch (requestError) {
    error.value =
      requestError.response?.data?.error ||
      t('CONVERSATION.CANDY_AI.ERRORS.GENERATE');
  } finally {
    isRequesting.value = false;
  }
};

const startEditing = () => {
  editingId.value = latestSuggestion.value?.id;
  editedContent.value = latestSuggestion.value?.content || '';
};

const stopEditing = () => {
  editingId.value = null;
  editedContent.value = latestSuggestion.value?.content || '';
};

const signalLabel = key => t(`CONVERSATION.CANDY_AI.${key.toUpperCase()}`);

watch(() => props.conversationId, fetchSuggestions);
onMounted(fetchSuggestions);
onBeforeUnmount(() => clearTimeout(pollTimeout));
</script>

<template>
  <section class="border-b border-n-slate-5 bg-n-surface-2 px-4 py-3">
    <div class="flex items-center justify-between gap-2">
      <div>
        <h3 class="text-sm font-medium text-n-slate-12">
          {{ t('CONVERSATION.CANDY_AI.TITLE') }}
        </h3>
        <p class="text-xs text-n-slate-11">
          {{ t('CONVERSATION.CANDY_AI.DESCRIPTION') }}
        </p>
      </div>
      <Button
        v-if="!isBusy && latestSuggestion?.status !== 'failed'"
        :label="
          latestSuggestion
            ? t('CONVERSATION.CANDY_AI.REGENERATE')
            : t('CONVERSATION.CANDY_AI.REQUEST')
        "
        sm
        slate
        :is-loading="isRequesting"
        :disabled="isRequesting"
        @click="latestSuggestion ? regenerateSuggestion() : requestSuggestion()"
      />
    </div>

    <p v-if="isLoading" class="mt-3 text-xs text-n-slate-11">
      {{ t('CONVERSATION.CANDY_AI.LOADING') }}
    </p>
    <p v-else-if="isBusy" class="mt-3 text-xs text-n-slate-11">
      {{ t('CONVERSATION.CANDY_AI.GENERATING') }}
    </p>
    <p
      v-else-if="latestSuggestion?.status === 'failed'"
      class="mt-3 text-xs text-n-ruby-11"
    >
      {{ failureMessage }}
    </p>
    <p v-else-if="error" class="mt-3 text-xs text-n-ruby-11">{{ error }}</p>

    <div v-if="latestSuggestion?.status === 'generated'" class="mt-3">
      <div
        v-if="intelligence && Object.keys(intelligence).length"
        class="mb-2 flex flex-wrap gap-1.5"
      >
        <span
          v-if="intelligence.intent"
          class="rounded-full bg-n-slate-3 px-2 py-0.5 text-[11px] text-n-slate-11"
        >
          {{ signalLabel('intent') }}: {{ intelligence.intent }}
        </span>
        <span
          v-if="intelligence.sentiment"
          class="rounded-full bg-n-slate-3 px-2 py-0.5 text-[11px] text-n-slate-11"
        >
          {{ signalLabel('sentiment') }}: {{ intelligence.sentiment }}
        </span>
        <span
          v-if="intelligence.urgency"
          class="rounded-full bg-n-slate-3 px-2 py-0.5 text-[11px] text-n-slate-11"
        >
          {{ signalLabel('urgency') }}: {{ intelligence.urgency }}
        </span>
        <span
          v-if="intelligence.needs_human"
          class="rounded-full bg-n-amber-3 px-2 py-0.5 text-[11px] text-n-amber-11"
        >
          {{ t('CONVERSATION.CANDY_AI.ESCALATE') }}
        </span>
      </div>

      <textarea
        v-if="editingId === latestSuggestion.id"
        v-model="editedContent"
        rows="5"
        class="w-full rounded-md border border-n-slate-6 bg-n-surface-1 px-3 py-2 text-sm text-n-slate-12"
      />
      <p v-else class="whitespace-pre-wrap text-sm text-n-slate-12">
        {{ latestSuggestion.content }}
      </p>
      <div class="mt-3 flex flex-wrap gap-2">
        <Button
          v-if="editingId === latestSuggestion.id"
          :label="t('CONVERSATION.CANDY_AI.USE')"
          sm
          @click="acceptSuggestion"
        />
        <Button
          v-else
          :label="t('CONVERSATION.CANDY_AI.EDIT')"
          sm
          slate
          @click="startEditing"
        />
        <Button
          v-if="editingId === latestSuggestion.id"
          :label="t('CONVERSATION.CANDY_AI.CANCEL')"
          sm
          slate
          @click="stopEditing"
        />
        <Button
          v-else
          :label="t('CONVERSATION.CANDY_AI.REJECT')"
          sm
          slate
          @click="rejectSuggestion"
        />
      </div>
    </div>
  </section>
</template>
