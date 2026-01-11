import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Create axios instance with default config
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    return data;
  },

  register: async (email: string, password: string, name: string) => {
    const { data } = await api.post('/api/auth/register', { email, password, name });
    return data;
  },

  getMe: async () => {
    const { data } = await api.get('/api/auth/me');
    return data;
  },

  updateProfile: async (updates: { name?: string; avatar?: string; preferences?: object }) => {
    const { data } = await api.patch('/api/auth/profile', updates);
    return data;
  },
};

// Project API
export const projectApi = {
  getAll: async () => {
    const { data } = await api.get('/api/projects');
    return data;
  },

  getOne: async (id: string) => {
    const { data } = await api.get(`/api/projects/${id}`);
    return data;
  },

  create: async (payload: { name: string; description?: string }) => {
    const { data } = await api.post('/api/projects', payload);
    return data;
  },

  update: async (id: string, payload: { name?: string; description?: string }) => {
    const { data } = await api.patch(`/api/projects/${id}`, payload);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await api.delete(`/api/projects/${id}`);
    return data;
  },
};

// File API
export const fileApi = {
  getTree: async (projectId: string) => {
    const { data } = await api.get(`/api/projects/${projectId}/files/tree`);
    return data;
  },

  getContent: async (projectId: string, fileId: string) => {
    const { data } = await api.get(`/api/projects/${projectId}/files/${fileId}`);
    return data;
  },

  create: async (projectId: string, payload: { path: string; name: string; content?: string; isDirectory?: boolean }) => {
    const { data } = await api.post(`/api/projects/${projectId}/files`, payload);
    return data;
  },

  update: async (projectId: string, fileId: string, payload: { content?: string; path?: string; name?: string }) => {
    const { data } = await api.patch(`/api/projects/${projectId}/files/${fileId}`, payload);
    return data;
  },

  delete: async (projectId: string, fileId: string) => {
    const { data } = await api.delete(`/api/projects/${projectId}/files/${fileId}`);
    return data;
  },

  getVersions: async (projectId: string, fileId: string) => {
    const { data } = await api.get(`/api/projects/${projectId}/files/${fileId}/versions`);
    return data;
  },

  restoreVersion: async (projectId: string, fileId: string, versionId: string) => {
    const { data } = await api.post(`/api/projects/${projectId}/files/${fileId}/versions/${versionId}/restore`);
    return data;
  },

  upload: async (projectId: string, file: File, parentPath?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (parentPath) formData.append('parentPath', parentPath);
    
    const { data } = await api.post(`/api/projects/${projectId}/files/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  download: async (projectId: string, fileId: string) => {
    return api.get(`/api/projects/${projectId}/files/${fileId}/download`, {
      responseType: 'blob',
    });
  },
};

// Agent API
export const agentApi = {
  createTask: async (payload: { type: string; prompt: string; projectId: string; context?: object; priority?: number }) => {
    const { data } = await api.post('/api/agents/tasks', payload);
    return data;
  },

  getTasks: async (statuses?: string[]) => {
    const params = statuses ? { status: statuses } : {};
    const { data } = await api.get('/api/agents/tasks', { params });
    return data;
  },

  getProjectTasks: async (projectId: string) => {
    const { data } = await api.get(`/api/agents/projects/${projectId}/tasks`);
    return data;
  },

  getTask: async (taskId: string) => {
    const { data } = await api.get(`/api/agents/tasks/${taskId}`);
    return data;
  },

  cancelTask: async (taskId: string) => {
    const { data } = await api.post(`/api/agents/tasks/${taskId}/cancel`);
    return data;
  },

  retryTask: async (taskId: string) => {
    const { data } = await api.post(`/api/agents/tasks/${taskId}/retry`);
    return data;
  },

  approveTask: async (taskId: string) => {
    const { data } = await api.post(`/api/agents/tasks/${taskId}/approve`);
    return data;
  },

  rejectTask: async (taskId: string, reason?: string) => {
    const { data } = await api.post(`/api/agents/tasks/${taskId}/reject`, { reason });
    return data;
  },
};

// Artifact API
export const artifactApi = {
  getArtifact: async (id: string) => {
    const { data } = await api.get(`/api/artifacts/${id}`);
    return data;
  },

  getByTask: async (taskId: string) => {
    const { data } = await api.get(`/api/artifacts/task/${taskId}`);
    return data;
  },

  addFeedback: async (id: string, feedback: { rating?: number; comment?: string }) => {
    const { data } = await api.post(`/api/artifacts/${id}/feedback`, feedback);
    return data;
  },

  apply: async (id: string) => {
    const { data } = await api.post(`/api/artifacts/${id}/apply`);
    return data;
  },
};

// AI API
export const aiApi = {
  getInfo: async () => {
    const { data } = await api.get('/api/ai/info');
    return data;
  },

  getProviderInfo: async () => {
    const { data } = await api.get('/api/ai/info');
    return data;
  },

  listModels: async () => {
    const { data } = await api.get('/api/ai/models');
    return data;
  },

  chat: async (messages: { role: string; content: string }[], options?: object) => {
    const { data } = await api.post('/api/ai/chat', { messages, options });
    return data;
  },

  generate: async (prompt: string, context?: string, language?: string) => {
    const { data } = await api.post('/api/ai/generate', { prompt, context, language });
    return data;
  },

  review: async (code: string, language?: string) => {
    const { data } = await api.post('/api/ai/review', { code, language });
    return data;
  },
};

// Admin Chat API
export const adminChatApi = {
  getAllSessions: async (params?: { page?: number; limit?: number; userId?: string; projectId?: string; search?: string }) => {
    const { data } = await api.get('/api/admin/chat/sessions', { params });
    return data;
  },

  getSession: async (id: string) => {
    const { data } = await api.get(`/api/admin/chat/sessions/${id}`);
    return data;
  },

  deleteSession: async (id: string) => {
    const { data } = await api.delete(`/api/admin/chat/sessions/${id}`);
    return data;
  },

  getStats: async () => {
    const { data } = await api.get('/api/admin/chat/stats');
    return data;
  },

  getAppliedCode: async (params?: { page?: number; limit?: number }) => {
    const { data } = await api.get('/api/admin/chat/applied-code', { params });
    return data;
  },
};

export default api;
