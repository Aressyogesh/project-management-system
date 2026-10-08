import { apiClient } from './client';

export const uploadsApi = {
  uploadImage: async (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post<{ url: string }>('/uploads/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};
