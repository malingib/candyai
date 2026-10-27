/* global axios */
import ApiClient from './ApiClient';

class CandyAiKnowledgeDocumentsAPI extends ApiClient {
  constructor() {
    super('candy_ai/knowledge_documents', { accountScoped: true });
  }

  getAll({ status } = {}) {
    return axios.get(this.url, { params: status ? { status } : {} });
  }

  get(id) {
    return axios.get(`${this.url}/${id}`);
  }

  create({ title, content, url, inbox_id: inboxId }) {
    return axios.post(this.url, {
      title,
      content,
      url,
      inbox_id: inboxId,
    });
  }

  update(id, attributes) {
    return axios.patch(`${this.url}/${id}`, attributes);
  }

  archive(id) {
    return axios.post(`${this.url}/${id}/archive`);
  }

  refresh(id) {
    return axios.post(`${this.url}/${id}/refresh`);
  }

  delete(id) {
    return axios.delete(`${this.url}/${id}`);
  }
}

export default new CandyAiKnowledgeDocumentsAPI();
