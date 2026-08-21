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
}

export default new CandyAiAPI();
