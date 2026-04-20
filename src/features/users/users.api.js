import { api } from '../../lib/api.js';

export const usersApi = {
  list: async ({ page = 1, limit = 20, search } = {}) => {
    const params = { page, limit };
    if (search) params.search = search;
    const { data } = await api.get('/admin/users', { params });
    return data;
  },
};
