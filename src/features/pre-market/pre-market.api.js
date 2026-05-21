import { api } from '../../lib/api.js';

export const preMarketApi = {
  list: async ({ page = 1, limit = 50, from, to, includeDrafts = true } = {}) => {
    const params = { page, limit, includeDrafts };
    if (from) params.from = from;
    if (to) params.to = to;
    const { data } = await api.get('/pre-market/admin/list', { params });
    return data;
  },
  getById: async (id) => {
    const { data } = await api.get(`/pre-market/admin/${id}`);
    return data.report;
  },
  create: async (payload) => {
    const { data } = await api.post('/pre-market', payload);
    return data.report;
  },
  update: async (id, payload) => {
    const { data } = await api.patch(`/pre-market/${id}`, payload);
    return data.report;
  },
  remove: async (id) => {
    await api.delete(`/pre-market/${id}`);
  },
};
