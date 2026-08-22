<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useCandyAiStore } from 'dashboard/store/candyAi';
import SettingsLayout from '../SettingsLayout.vue';
import BaseSettingsHeader from '../components/BaseSettingsHeader.vue';
import SectionLayout from '../account/components/SectionLayout.vue';

const store = useCandyAiStore();
const { t } = useI18n();
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
    error.value = t('CANDY_AI.ERRORS.SAVE');
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
    error.value = t('CANDY_AI.ERRORS.LOAD');
  }
});
</script>

<template>
  <SettingsLayout
    :is-loading="store.isFetching"
    :loading-message="t('CANDY_AI.LOADING')"
  >
    <template #header>
      <BaseSettingsHeader
        :title="t('CANDY_AI.TITLE')"
        :description="t('CANDY_AI.DESCRIPTION')"
        icon-name="sparkles"
      />
    </template>

    <template #body>
      <div class="flex flex-col gap-1 pb-8">
        <SectionLayout
          :title="t('CANDY_AI.GENERAL.TITLE')"
          :description="t('CANDY_AI.GENERAL.DESCRIPTION')"
        >
          <label class="flex items-center justify-between gap-6 py-2">
            <span>
              <span class="block text-sm font-medium text-n-slate-12">{{
                t('CANDY_AI.GENERAL.ENABLE')
              }}</span>
              <span class="block text-sm text-n-slate-11 mt-1">{{
                t('CANDY_AI.GENERAL.ENABLE_DESCRIPTION')
              }}</span>
            </span>
            <input v-model="form.enabled" type="checkbox" class="h-5 w-5" />
          </label>
        </SectionLayout>

        <SectionLayout
          :title="t('CANDY_AI.PROVIDER.TITLE')"
          :description="t('CANDY_AI.PROVIDER.DESCRIPTION')"
          with-border
        >
          <div class="grid gap-5 md:grid-cols-2">
            <label class="grid gap-1">
              <span class="text-sm font-medium text-n-slate-12">{{
                t('CANDY_AI.PROVIDER.LABEL')
              }}</span>
              <select
                v-model="form.provider"
                class="w-full rounded-md border border-n-slate-6 bg-n-slate-1 px-3 py-2 text-sm"
              >
                <option value="openai">
                  {{ t('CANDY_AI.PROVIDER.OPENAI') }}
                </option>
                <option value="anthropic">
                  {{ t('CANDY_AI.PROVIDER.ANTHROPIC') }}
                </option>
                <option value="gemini">
                  {{ t('CANDY_AI.PROVIDER.GEMINI') }}
                </option>
                <option value="custom">
                  {{ t('CANDY_AI.PROVIDER.CUSTOM') }}
                </option>
              </select>
            </label>

            <label class="grid gap-1">
              <span class="text-sm font-medium text-n-slate-12">{{
                t('CANDY_AI.PROVIDER.MODEL')
              }}</span>
              <input
                v-model="form.model"
                type="text"
                class="w-full rounded-md border border-n-slate-6 bg-n-slate-1 px-3 py-2 text-sm"
                :placeholder="t('CANDY_AI.PROVIDER.MODEL_PLACEHOLDER')"
              />
            </label>
          </div>
        </SectionLayout>

        <SectionLayout
          :title="t('CANDY_AI.BEHAVIOR.TITLE')"
          :description="t('CANDY_AI.BEHAVIOR.DESCRIPTION')"
          with-border
        >
          <div class="grid gap-5">
            <label class="grid gap-1">
              <span class="text-sm font-medium text-n-slate-12">{{
                t('CANDY_AI.BEHAVIOR.SYSTEM_PROMPT')
              }}</span>
              <textarea
                v-model="form.system_prompt"
                rows="7"
                class="w-full rounded-md border border-n-slate-6 bg-n-slate-1 px-3 py-2 text-sm"
                :placeholder="t('CANDY_AI.BEHAVIOR.SYSTEM_PROMPT_PLACEHOLDER')"
              />
            </label>

            <div class="grid gap-5 md:grid-cols-2">
              <label class="grid gap-1">
                <span class="text-sm font-medium text-n-slate-12">{{
                  t('CANDY_AI.BEHAVIOR.TEMPERATURE')
                }}</span>
                <input
                  v-model.number="form.temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  class="w-full rounded-md border border-n-slate-6 bg-n-slate-1 px-3 py-2 text-sm"
                />
              </label>
              <label class="grid gap-1">
                <span class="text-sm font-medium text-n-slate-12">{{
                  t('CANDY_AI.BEHAVIOR.MAX_TOKENS')
                }}</span>
                <input
                  v-model.number="form.max_tokens"
                  type="number"
                  min="1"
                  max="32768"
                  step="1"
                  class="w-full rounded-md border border-n-slate-6 bg-n-slate-1 px-3 py-2 text-sm"
                />
              </label>
            </div>
          </div>
        </SectionLayout>

        <SectionLayout
          :title="t('CANDY_AI.HANDOFF.TITLE')"
          :description="t('CANDY_AI.HANDOFF.DESCRIPTION')"
          with-border
        >
          <div class="grid gap-5">
            <label class="flex items-center justify-between gap-6 py-2">
              <span>
                <span class="block text-sm font-medium text-n-slate-12">{{
                  t('CANDY_AI.HANDOFF.ENABLE')
                }}</span>
                <span class="block text-sm text-n-slate-11 mt-1">{{
                  t('CANDY_AI.HANDOFF.ENABLE_DESCRIPTION')
                }}</span>
              </span>
              <input
                v-model="form.handoff_enabled"
                type="checkbox"
                class="h-5 w-5"
              />
            </label>

            <label class="grid gap-1">
              <span class="text-sm font-medium text-n-slate-12">{{
                t('CANDY_AI.HANDOFF.MESSAGE')
              }}</span>
              <textarea
                v-model="form.handoff_message"
                rows="3"
                class="w-full rounded-md border border-n-slate-6 bg-n-slate-1 px-3 py-2 text-sm"
              />
            </label>
          </div>
        </SectionLayout>

        <div
          v-if="error"
          class="rounded-md border border-ruby-6 bg-ruby-2 px-4 py-3 text-sm text-ruby-11"
        >
          {{ error }}
        </div>
        <div
          v-if="saved"
          class="rounded-md border border-woot-6 bg-woot-2 px-4 py-3 text-sm text-woot-11"
        >
          {{ t('CANDY_AI.SAVED') }}
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <button
            type="button"
            class="rounded-md border border-n-slate-6 px-4 py-2 text-sm font-medium"
            @click="reset"
          >
            {{ t('CANDY_AI.RESET') }}
          </button>
          <button
            type="button"
            class="rounded-md bg-n-slate-12 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            :disabled="store.isSaving"
            @click="save"
          >
            {{ store.isSaving ? t('CANDY_AI.SAVING') : t('CANDY_AI.SAVE') }}
          </button>
        </div>
      </div>
    </template>
  </SettingsLayout>
</template>
