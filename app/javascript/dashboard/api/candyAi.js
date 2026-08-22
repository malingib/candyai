/* global axios */
import ApiClient from './ApiClient';

class CandyAiAPI extends ApiClient {
  constructor() {
    super('candy_ai', { accountScoped: true });
  }

  get() {
    return axios.get(this.url);
  }

  update(settings) {
    return axios.put(this.url, { settings });
  }

  listSuggestions(conversationId) {
    return axios.get(`${this.baseUrl()}/candy_ai_suggestions`, {
      params: { conversation_id: conversationId },
    });
  }

  createSuggestion(conversationId, messageId) {
    return axios.post(`${this.baseUrl()}/candy_ai_suggestions`, {
      conversation_id: conversationId,
      message_id: messageId,
    });
  }

  getSuggestion(id) {
    return axios.get(`${this.baseUrl()}/candy_ai_suggestions/${id}`);
  }

  updateSuggestion(id, data) {
    return axios.patch(`${this.baseUrl()}/candy_ai_suggestions/${id}`, data);
  }

  regenerateSuggestion(id) {
    return axios.post(
      `${this.baseUrl()}/candy_ai_suggestions/${id}/regenerate`
    );
  }
}

export default new CandyAiAPI();
