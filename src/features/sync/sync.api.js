import { api } from '../../lib/api.js';

export const syncApi = {
  async health(signal) {
    const { data } = await api.get('/admin/sync/health', { signal });
    return data;
  },
  async listRuns(limit = 50, signal) {
    const { data } = await api.get('/admin/sync/runs', { params: { limit }, signal });
    return data.runs ?? [];
  },
  async getRun(id, signal) {
    const { data } = await api.get(`/admin/sync/runs/${id}`, { signal });
    return data;
  },
  async triggerDaily(scope) {
    const { data } = await api.post('/admin/sync/daily', scope ?? {});
    return data;
  },
};
