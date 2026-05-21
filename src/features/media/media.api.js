import axios from 'axios';
import { api } from '../../lib/api.js';

export const mediaApi = {
  signUpload: async (folderKey, extra = {}) => {
    const { data } = await api.post(`/media/sign-upload/${folderKey}`, extra);
    return data;
  },

  deleteByUrl: async (url) => {
    await api.delete('/media', { data: { url } });
  },

  uploadFile: async ({ file, folderKey, resourceType, onProgress }) => {
    const signBody = resourceType ? { resourceType } : {};
    const sig = await mediaApi.signUpload(folderKey, signBody);

    const form = new FormData();
    form.append('file', file);
    form.append('api_key', sig.apiKey);
    form.append('timestamp', String(sig.timestamp));
    form.append('signature', sig.signature);
    form.append('folder', sig.folder);
    if (sig.type && sig.type !== 'upload') form.append('type', sig.type);

    const { data } = await axios.post(sig.uploadUrl, form, {
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    });
    return data;
  },
};
