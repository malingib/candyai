import { defineStore } from 'pinia';
import CandyAiAPI from 'dashboard/api/candyAi';

const defaults = {
  enabled: false,
  provider: 'openai',
  model: 'gpt-4o-mini',
  system_prompt: '',
  temperature: 0.3,
  max_tokens: 800,
  handoff_enabled: true,
  handoff_message:
    'I’m connecting you with a human teammate who can help further.',
};

export const useCandyAiStore = defineStore('candyAi', {
  state: () => ({
    settings: { ...defaults },
    uiFlags: {
      isFetching: false,
      isSaving: false,
    },
  }),

  getters: {
    getSettings: state => state.settings,
    isFetching: state => state.uiFlags.isFetching,
    isSaving: state => state.uiFlags.isSaving,
  },

  actions: {
    async fetch() {
      this.uiFlags.isFetching = true;
      try {
        const response = await CandyAiAPI.get();
        this.settings = { ...defaults, ...(response.data.settings || {}) };
      } finally {
        this.uiFlags.isFetching = false;
      }
    },

    async save(settings) {
      this.uiFlags.isSaving = true;
      try {
        const response = await CandyAiAPI.update(settings);
        this.settings = { ...defaults, ...(response.data.settings || {}) };
      } finally {
        this.uiFlags.isSaving = false;
      }
    },
  },
});
