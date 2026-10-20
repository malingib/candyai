<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import CandyAiKnowledgeDocumentsAPI from 'dashboard/api/candyAiKnowledgeDocuments';
import SectionLayout from '../account/components/SectionLayout.vue';

const { t } = useI18n();
const documents = ref([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const notice = ref('');
const confirmDeleteId = ref(null);
const editingId = ref(null);
const editForm = reactive({ title: '', content: '' });
const form = reactive({ source_type: 'url', title: '', url: '', content: '' });

const load = async () => {
  loading.value = true;
  error.value = '';
  try {
    const response = await CandyAiKnowledgeDocumentsAPI.getAll();
    documents.value = response.data.payload || [];
  } catch (e) {
    error.value = t('CANDY_AI.KNOWLEDGE.LOAD_ERROR');
  } finally {
    loading.value = false;
  }
};

const add = async () => {
  saving.value = true;
  error.value = '';
  notice.value = '';
  try {
    await CandyAiKnowledgeDocumentsAPI.create({
      title: form.title,
      url: form.source_type === 'url' ? form.url : undefined,
      content: form.source_type === 'text' ? form.content : undefined,
    });
    form.title = '';
    form.url = '';
    form.content = '';
    notice.value = t('CANDY_AI.KNOWLEDGE.ADDED');
    await load();
  } catch (e) {
    error.value =
      e?.response?.data?.error || t('CANDY_AI.KNOWLEDGE.SAVE_ERROR');
  } finally {
    saving.value = false;
  }
};

const startEdit = async document => {
  error.value = '';
  try {
    const response = await CandyAiKnowledgeDocumentsAPI.get(document.id);
    const source = response.data.payload;
    editForm.title = source.title || '';
    editForm.content = source.content || '';
    editingId.value = document.id;
  } catch (e) {
    error.value = t('CANDY_AI.KNOWLEDGE.ACTION_ERROR');
  }
};

const saveEdit = async id => {
  error.value = '';
  notice.value = '';
  try {
    await CandyAiKnowledgeDocumentsAPI.update(id, {
      title: editForm.title,
      content: editForm.content,
    });
    editingId.value = null;
    notice.value = t('CANDY_AI.KNOWLEDGE.UPDATED');
    await load();
  } catch (e) {
    error.value =
      e?.response?.data?.error || t('CANDY_AI.KNOWLEDGE.SAVE_ERROR');
  }
};

const runAction = async (action, id, successMessage) => {
  error.value = '';
  notice.value = '';
  try {
    await CandyAiKnowledgeDocumentsAPI[action](id);
    confirmDeleteId.value = null;
    notice.value = successMessage;
    await load();
  } catch (e) {
    error.value =
      e?.response?.data?.error || t('CANDY_AI.KNOWLEDGE.ACTION_ERROR');
  }
};

onMounted(load);
</script>

<template>
  <SectionLayout
    :title="t('CANDY_AI.KNOWLEDGE.TITLE')"
    :description="t('CANDY_AI.KNOWLEDGE.DESCRIPTION')"
    with-border
  >
    <div class="flex flex-col gap-4">
      <div class="grid gap-4 md:grid-cols-2">
        <label class="grid gap-1">
          <span class="text-sm font-medium text-n-slate-12">{{
            t('CANDY_AI.KNOWLEDGE.TYPE')
          }}</span>
          <select
            v-model="form.source_type"
            class="w-full rounded-md border border-n-slate-6 bg-n-slate-1 px-3 py-2 text-sm"
          >
            <option value="url">{{ t('CANDY_AI.KNOWLEDGE.URL') }}</option>
            <option value="text">{{ t('CANDY_AI.KNOWLEDGE.TEXT') }}</option>
          </select>
        </label>
        <label class="grid gap-1">
          <span class="text-sm font-medium text-n-slate-12">{{
            t('CANDY_AI.KNOWLEDGE.DOCUMENT_TITLE')
          }}</span>
          <input
            v-model="form.title"
            type="text"
            maxlength="255"
            class="w-full rounded-md border border-n-slate-6 bg-n-slate-1 px-3 py-2 text-sm"
            :placeholder="t('CANDY_AI.KNOWLEDGE.TITLE_PLACEHOLDER')"
          />
        </label>
      </div>

      <label v-if="form.source_type === 'url'" class="grid gap-1">
        <span class="text-sm font-medium text-n-slate-12">{{
          t('CANDY_AI.KNOWLEDGE.SOURCE_URL')
        }}</span>
        <input
          v-model="form.url"
          type="url"
          required
          class="w-full rounded-md border border-n-slate-6 bg-n-slate-1 px-3 py-2 text-sm"
           :placeholder="t('CANDY_AI.KNOWLEDGE.URL_PLACEHOLDER')"
        />
        <span class="text-xs text-n-slate-11">{{
          t('CANDY_AI.KNOWLEDGE.URL_HELP')
        }}</span>
      </label>
      <label v-else class="grid gap-1">
        <span class="text-sm font-medium text-n-slate-12">{{
          t('CANDY_AI.KNOWLEDGE.CONTENT')
        }}</span>
        <textarea
          v-model="form.content"
          required
          rows="5"
          maxlength="2000000"
          class="w-full rounded-md border border-n-slate-6 bg-n-slate-1 px-3 py-2 text-sm"
          :placeholder="t('CANDY_AI.KNOWLEDGE.CONTENT_PLACEHOLDER')"
        />
      </label>

      <div class="flex justify-end">
        <button
          type="button"
          class="rounded-md bg-n-slate-12 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          :disabled="
            saving ||
            (form.source_type === 'url'
              ? !form.url.trim()
              : !form.content.trim())
          "
          @click="add"
        >
          {{
            saving
              ? t('CANDY_AI.KNOWLEDGE.ADDING')
              : t('CANDY_AI.KNOWLEDGE.ADD')
          }}
        </button>
      </div>

      <div
        v-if="error"
        class="rounded-md border border-ruby-6 px-4 py-3 text-sm text-ruby-11"
        role="alert"
      >
        {{ error }}
      </div>
      <div
        v-if="notice"
        class="rounded-md border border-n-weak px-4 py-3 text-sm"
        role="status"
      >
        {{ notice }}
      </div>

      <div class="flex items-center justify-between gap-3">
        <h3 class="text-sm font-semibold text-n-slate-12">
          {{ t('CANDY_AI.KNOWLEDGE.SOURCES') }}
        </h3>
        <button
          type="button"
          class="text-sm underline"
          :disabled="loading"
          @click="load"
        >
          {{
            loading
              ? t('CANDY_AI.KNOWLEDGE.LOADING')
              : t('CANDY_AI.KNOWLEDGE.REFRESH_LIST')
          }}
        </button>
      </div>

      <p
        v-if="!loading && documents.length === 0"
        class="text-sm text-n-slate-11"
      >
        {{ t('CANDY_AI.KNOWLEDGE.EMPTY') }}
      </p>

      <ul v-else class="divide-y divide-n-weak">
        <li
          v-for="document in documents"
          :key="document.id"
          class="flex flex-col gap-3 py-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="font-medium text-n-slate-12">
                {{ document.title }}
              </div>
              <div
                v-if="document.source_url"
                class="mt-1 break-all text-xs text-n-slate-11"
              >
                {{ document.source_url }}
              </div>
              <div class="mt-1 text-xs text-n-slate-11">
                {{ document.source_type }} · {{ document.status }}
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-if="editingId !== document.id"
                type="button"
                class="rounded-md border border-n-slate-6 px-3 py-1.5 text-xs"
                @click="startEdit(document)"
              >
                {{ t('CANDY_AI.KNOWLEDGE.EDIT') }}
              </button>
              <button
                v-if="
                  document.source_type === 'url' && document.status === 'active'
                "
                type="button"
                class="rounded-md border border-n-slate-6 px-3 py-1.5 text-xs"
                @click="
                  runAction(
                    'refresh',
                    document.id,
                    t('CANDY_AI.KNOWLEDGE.REFRESHED')
                  )
                "
              >
                {{ t('CANDY_AI.KNOWLEDGE.REFRESH_SOURCE') }}
              </button>
              <button
                v-if="document.status === 'active'"
                type="button"
                class="rounded-md border border-n-slate-6 px-3 py-1.5 text-xs"
                @click="
                  runAction(
                    'archive',
                    document.id,
                    t('CANDY_AI.KNOWLEDGE.ARCHIVED')
                  )
                "
              >
                {{ t('CANDY_AI.KNOWLEDGE.ARCHIVE') }}
              </button>
              <button
                v-if="confirmDeleteId !== document.id"
                type="button"
                class="rounded-md border border-ruby-6 px-3 py-1.5 text-xs text-ruby-11"
                @click="confirmDeleteId = document.id"
              >
                {{ t('CANDY_AI.KNOWLEDGE.DELETE') }}
              </button>
              <template v-else>
                <button
                  type="button"
                  class="rounded-md bg-ruby-9 px-3 py-1.5 text-xs text-white"
                  @click="
                    runAction(
                      'delete',
                      document.id,
                      t('CANDY_AI.KNOWLEDGE.DELETED')
                    )
                  "
                >
                  {{ t('CANDY_AI.KNOWLEDGE.CONFIRM_DELETE') }}
                </button>
                <button
                  type="button"
                  class="rounded-md border border-n-slate-6 px-3 py-1.5 text-xs"
                  @click="confirmDeleteId = null"
                >
                  {{ t('CANDY_AI.KNOWLEDGE.CANCEL') }}
                </button>
              </template>
            </div>
          </div>
          <div
            v-if="editingId === document.id"
            class="grid gap-3 rounded-md border border-n-weak p-3"
          >
            <label class="grid gap-1">
              <span class="text-sm font-medium text-n-slate-12">{{
                t('CANDY_AI.KNOWLEDGE.DOCUMENT_TITLE')
              }}</span>
              <input
                v-model="editForm.title"
                maxlength="255"
                class="w-full rounded-md border border-n-slate-6 bg-n-slate-1 px-3 py-2 text-sm"
              />
            </label>
            <label class="grid gap-1">
              <span class="text-sm font-medium text-n-slate-12">{{
                t('CANDY_AI.KNOWLEDGE.CONTENT')
              }}</span>
              <textarea
                v-model="editForm.content"
                rows="5"
                maxlength="2000000"
                class="w-full rounded-md border border-n-slate-6 bg-n-slate-1 px-3 py-2 text-sm"
              />
            </label>
            <div class="flex justify-end gap-2">
              <button
                type="button"
                class="rounded-md border border-n-slate-6 px-3 py-1.5 text-xs"
                @click="editingId = null"
              >
                {{ t('CANDY_AI.KNOWLEDGE.CANCEL') }}
              </button>
              <button
                type="button"
                class="rounded-md bg-n-slate-12 px-3 py-1.5 text-xs text-white"
                :disabled="!editForm.title.trim() || !editForm.content.trim()"
                @click="saveEdit(document.id)"
              >
                {{ t('CANDY_AI.KNOWLEDGE.SAVE_CHANGES') }}
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </SectionLayout>
</template>
