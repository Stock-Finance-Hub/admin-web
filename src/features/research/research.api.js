import { api } from '../../lib/api.js';

export const researchApi = {
  list: async ({ page = 1, limit = 20, segment, symbol, includeDrafts = true } = {}) => {
    const params = { page, limit };
    if (segment) params.segment = segment;
    if (symbol) params.symbol = symbol;
    if (includeDrafts !== undefined) params.includeDrafts = String(includeDrafts);
    const { data } = await api.get('/research/admin/list', { params });
    return data;
  },
  getById: async (id) => {
    const { data } = await api.get(`/research/admin/${id}`);
    return data.report;
  },
  create: async (payload) => {
    const { data } = await api.post('/research', payload);
    return data.report;
  },
  update: async (id, payload) => {
    const { data } = await api.patch(`/research/${id}`, payload);
    return data.report;
  },
  remove: async (id) => {
    await api.delete(`/research/${id}`);
  },
};
