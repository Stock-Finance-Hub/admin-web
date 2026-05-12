import { api } from '../../lib/api.js';

export const instrumentsApi = {
  list: async ({ page = 1, limit = 20, search, segment, type, hasLogo, activeOnly } = {}) => {
    const params = { page, limit };
    if (search) params.search = search;
    if (segment) params.segment = segment;
    if (type) params.type = type;
    if (hasLogo !== undefined) params.hasLogo = String(hasLogo);
    if (activeOnly !== undefined) params.activeOnly = String(activeOnly);
    const { data } = await api.get('/admin/instruments', { params });
    return data;
  },

  getOne: async (segment, symbol) => {
    const { data } = await api.get(
      `/admin/instruments/${encodeURIComponent(segment)}/${encodeURIComponent(symbol)}`,
    );
    return data.instrument;
  },

  bySymbols: async (symbols, { segment = 'NSE_EQ' } = {}) => {
    if (!symbols?.length) return { items: [], total: 0 };
    const { data } = await api.get('/admin/instruments/by-symbols', {
      params: { symbols: symbols.join(','), segment },
    });
    return data;
  },

  update: async (segment, symbol, patch) => {
    const { data } = await api.patch(
      `/admin/instruments/${encodeURIComponent(segment)}/${encodeURIComponent(symbol)}`,
      patch,
    );
    return data.instrument;
  },

  signLogoUpload: async (segment, symbol) => {
    const { data } = await api.post(
      `/admin/instruments/${encodeURIComponent(segment)}/${encodeURIComponent(symbol)}/logo/sign`,
    );
    return data;
  },

  confirmLogoUpload: async (segment, symbol, payload) => {
    const { data } = await api.put(
      `/admin/instruments/${encodeURIComponent(segment)}/${encodeURIComponent(symbol)}/logo`,
      payload,
    );
    return data.instrument;
  },

  removeLogo: async (segment, symbol) => {
    const { data } = await api.delete(
      `/admin/instruments/${encodeURIComponent(segment)}/${encodeURIComponent(symbol)}/logo`,
    );
    return data.instrument;
  },

  indexConstituents: async (symbol) => {
    const { data } = await api.get(
      `/admin/instruments/index/${encodeURIComponent(symbol)}/constituents`,
    );
    return data;
  },

  candles: async (segment, symbol, { timeframe = '1d', from, to, limit } = {}) => {
    const params = { timeframe };
    if (from) params.from = from;
    if (to) params.to = to;
    if (limit) params.limit = limit;
    const { data } = await api.get(
      `/admin/instruments/${encodeURIComponent(segment)}/${encodeURIComponent(symbol)}/candles`,
      { params },
    );
    return data;
  },
};
