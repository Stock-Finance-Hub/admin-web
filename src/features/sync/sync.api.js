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
  async triggerIndices() {
    const { data } = await api.post('/admin/sync/indices');
    return data;
  },
  async triggerOneIndex(symbol) {
    const { data } = await api.post(`/admin/sync/indices/${encodeURIComponent(symbol)}`);
    return data;
  },
  async indicesCoverage(signal) {
    const { data } = await api.get('/admin/sync/indices/coverage', { signal });
    return data.items ?? [];
  },
  async wsTicket() {
    const { data } = await api.post('/admin/sync/ws-ticket');
    return data;
  },
};
