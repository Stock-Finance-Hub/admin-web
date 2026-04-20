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

  // Uploads a single file directly to Cloudinary using a signature from our backend.
  // Returns the Cloudinary response (secure_url, public_id, bytes, format, ...).
  uploadFile: async ({ file, folderKey, onProgress }) => {
    const sig = await mediaApi.signUpload(folderKey);

    const form = new FormData();
    form.append('file', file);
    form.append('api_key', sig.apiKey);
    form.append('timestamp', String(sig.timestamp));
    form.append('signature', sig.signature);
    form.append('folder', sig.folder);

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
