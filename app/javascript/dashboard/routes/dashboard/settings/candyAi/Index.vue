<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useCandyAiStore } from 'dashboard/store/candyAi';
import SettingsLayout from '../SettingsLayout.vue';
import BaseSettingsHeader from '../components/BaseSettingsHeader.vue';
import SectionLayout from '../account/components/SectionLayout.vue';

const store = useCandyAiStore();
const saved = ref(false);
const error = ref('');
const form = reactive({ ...store.getSettings });

const syncForm = () => Object.assign(form, store.getSettings);

const save = async () => {
  saved.value = false;
  error.value = '';
  try {
    await store.save({ ...form });
    syncForm();
    saved.value = true;
  } catch (e) {
    error.value = 'Unable to save CandyAI settings. Please try again.';
  }
};

const reset = () => {
  syncForm();
  saved.value = false;
  error.value = '';
};

onMounted(async () => {
  try {
    await store.fetch();
    syncForm();
  } catch (e) {
    error.value = 'Unable to load CandyAI settings.';
  }
});
</script>

<template>
  <SettingsLayout :is-loading="store.isFetching" loading-message="Loading CandyAI settings...">
    <template #header>
      <BaseSettingsHeader
        title="CandyAI"
        description="Configure CandyAI for AI-assisted customer conversations."
        icon-name="sparkles"
      />
    </template>

    <template #body>
      <div class="flex flex-col gap-1 pb-8">
        <SectionLayout
          title="General"
          description="Control whether CandyAI is available to your account."
        >
          <label class="flex items-center justify-between gap-6 py-2">
            <span>
              <span class="block text-sm font-medium text-n-slate-12">Enable CandyAI</span>
              <span class="block text-sm text-n-slate-11 mt-1">Allow CandyAI to assist with conversations.</span>
            </span>
            <input v-model="form.enabled" type="checkbox" class="h-5 w-5" />
          </label>
        </SectionLayout>

        <SectionLayout
          title="AI Provider"
          description="Choose the model provider and model used for CandyAI responses."
          with-border
        >
          <div class="grid gap-5 md:grid-cols-2">
            <label class="grid gap-1">
              <span class="text-sm font-medium text-n-slate-12">Provider</span>
              <select v-model="form.provider" class="w-full rounded-md border border-n-slate-6 bg-n-slate-1 px-3 py-2 text-sm">
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="gemini">Google Gemini</option>
                <option value="custom">Custom / OpenAI-compatible</option>
              </select>
            </label>

            <label class="grid gap-1">
              <span class="text-sm font-medium text-n-slate-12">Model</span>
              <input v-model="form.model" type="text" class="w-full rounded-md border border-n-slate-6 bg-n-slate-1 px-3 py-2 text-sm" placeholder="gpt-4o-mini" />
            </label>
          </div>
        </SectionLayout>

        <SectionLayout
          title="Behavior"
          description="Tune how CandyAI responds to customers."
          with-border
        >
          <div class="grid gap-5">
            <label class="grid gap-1">
              <span class="text-sm font-medium text-n-slate-12">System prompt</span>
              <textarea
                v-model="form.system_prompt"
                rows="7"
                class="w-full rounded-md border border-n-slate-6 bg-n-slate-1 px-3 py-2 text-sm"
                placeholder="You are CandyAI, a helpful customer support assistant..."
              />
            </label>

            <div class="grid gap-5 md:grid-cols-2">
              <label class="grid gap-1">
                <span class="text-sm font-medium text-n-slate-12">Temperature</span>
                <input v-model.number="form.temperature" type="number" min="0" max="2" step="0.1" class="w-full rounded-md border border-n-slate-6 bg-n-slate-1 px-3 py-2 text-sm" />
              </label>
              <label class="grid gap-1">
                <span class="text-sm font-medium text-n-slate-12">Maximum tokens</span>
                <input v-model.number="form.max_tokens" type="number" min="1" max="32768" step="1" class="w-full rounded-md border border-n-slate-6 bg-n-slate-1 px-3 py-2 text-sm" />
              </label>
            </div>
          </div>
        </SectionLayout>

        <SectionLayout
          title="Human Handoff"
          description="Give customers a clear path to a human agent when AI should stop."
          with-border
        >
          <div class="grid gap-5">
            <label class="flex items-center justify-between gap-6 py-2">
              <span>
                <span class="block text-sm font-medium text-n-slate-12">Enable human handoff</span>
                <span class="block text-sm text-n-slate-11 mt-1">Allow CandyAI to signal that a human agent should take over.</span>
              </span>
              <input v-model="form.handoff_enabled" type="checkbox" class="h-5 w-5" />
            </label>

            <label class="grid gap-1">
              <span class="text-sm font-medium text-n-slate-12">Handoff message</span>
              <textarea v-model="form.handoff_message" rows="3" class="w-full rounded-md border border-n-slate-6 bg-n-slate-1 px-3 py-2 text-sm" />
            </label>
          </div>
        </SectionLayout>

        <div v-if="error" class="rounded-md border border-ruby-6 bg-ruby-2 px-4 py-3 text-sm text-ruby-11">
          {{ error }}
        </div>
        <div v-if="saved" class="rounded-md border border-woot-6 bg-woot-2 px-4 py-3 text-sm text-woot-11">
          CandyAI settings saved.
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <button type="button" class="rounded-md border border-n-slate-6 px-4 py-2 text-sm font-medium" @click="reset">
            Reset
          </button>
          <button type="button" class="rounded-md bg-n-slate-12 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" :disabled="store.isSaving" @click="save">
            {{ store.isSaving ? 'Saving...' : 'Save settings' }}
          </button>
        </div>
      </div>
    </template>
  </SettingsLayout>
</template>
