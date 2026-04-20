import { api } from '../../lib/api.js';

export const authApi = {
  login: async ({ email, password }) => {
    const { data } = await api.post('/admin/login', { email, password });
    return data;
  },
  me: async () => {
    const { data } = await api.get('/admin/me');
    return data;
  },
};
