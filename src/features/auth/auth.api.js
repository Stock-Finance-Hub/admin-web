import { api } from '../../lib/api.js';

export const authApi = {
  login: async ({ email, password }) => {
    const { data } = await api.post('/admin/login', { email, password });
    return data;
  },

  verifyOtp: async ({ email, code }) => {
    const { data } = await api.post('/admin/otp/verify', { email, code });
    return data;
  },

  resendOtp: async ({ email }) => {
    const { data } = await api.post('/admin/otp/resend', { email });
    return data;
  },

  me: async () => {
    const { data } = await api.get('/admin/me');
    return data;
  },
};
