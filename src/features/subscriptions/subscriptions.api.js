import { api } from '../../lib/api.js';

export const subscriptionsApi = {
  list: async ({ page = 1, limit = 20, userId, status } = {}) => {
    const params = { page, limit };
    if (userId) params.userId = userId;
    if (status) params.status = status;
    const { data } = await api.get('/admin/subscriptions', { params });
    return data;
  },
  getById: async (id) => {
    const { data } = await api.get(`/admin/subscriptions/${id}`);
    return data.subscription;
  },
  create: async (payload) => {
    const { data } = await api.post('/admin/subscriptions', payload);
    return data.subscription;
  },
  update: async (id, payload) => {
    const { data } = await api.patch(`/admin/subscriptions/${id}`, payload);
    return data.subscription;
  },
};
