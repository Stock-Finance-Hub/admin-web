import { api } from '../../lib/api.js';

export const newsApi = {
  list: async ({ page = 1, limit = 20 } = {}) => {
    const { data } = await api.get('/news', { params: { page, limit } });
    return data;
  },
  getById: async (id) => {
    const { data } = await api.get(`/news/${id}`);
    return data.news;
  },
  create: async (payload) => {
    const { data } = await api.post('/news', payload);
    return data.news;
  },
  update: async (id, payload) => {
    const { data } = await api.patch(`/news/${id}`, payload);
    return data.news;
  },
  remove: async (id) => {
    await api.delete(`/news/${id}`);
  },
};
