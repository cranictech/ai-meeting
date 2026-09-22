import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  status: string;
}

export interface Profile {
  user_id: string;
  full_name?: string;
  profile_photo_url?: string;
  country?: string;
  timezone?: string;
  preferred_language: string;
  output_language: string;
  date_format: string;
  time_format: string;
  use_case?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface UserProfileResponse {
  user: User;
  profile: Profile;
}

export interface Meeting {
  id: string;
  title: string;
  status: string;
  created_at: string;
  duration_seconds?: number;
}

export interface ActionItem {
  id: string;
  task: string;
  assignee?: string;
  due_date?: string;
  status: string;
  priority: string;
}

export const authApi = {
  register: (email: string, password: string, fullName?: string) =>
    api.post<AuthResponse>('/auth/register', { email, password, fullName }),

  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),

  getProfile: () => api.get<UserProfileResponse>('/auth/me'),

  updateProfile: (data: Partial<Profile>) => {
    // Convert camelCase to snake_case for API
    const apiData: any = {};
    if (data.full_name !== undefined) apiData.full_name = data.full_name;
    if (data.country !== undefined) apiData.country = data.country;
    if (data.timezone !== undefined) apiData.timezone = data.timezone;
    if (data.preferred_language !== undefined) apiData.preferred_language = data.preferred_language;
    if (data.output_language !== undefined) apiData.output_language = data.output_language;
    if (data.date_format !== undefined) apiData.date_format = data.date_format;
    if (data.time_format !== undefined) apiData.time_format = data.time_format;
    if (data.use_case !== undefined) apiData.use_case = data.use_case;
    return api.patch<{ profile: Profile }>('/auth/profile', apiData);
  },

  logout: () => api.post('/auth/logout'),
};

export const oauthApi = {
  getGoogleAuthUrl: () => api.get<{ authUrl: string; state: string }>('/oauth/google/url'),

  handleGoogleCallback: (code: string) =>
    api.post<{ user: User; token: string; isNewUser: boolean }>('/oauth/google/callback', { code }),

  connectGoogle: (code: string) =>
    api.post<{ success: boolean }>('/oauth/google/connect', { code }),

  disconnectGoogle: () => api.delete('/oauth/google'),

  getConnectedAccounts: () => api.get<{ accounts: any[] }>('/oauth/accounts'),
};

export const meetingsApi = {
  create: (title: string, meetingType?: string) =>
    api.post<Meeting>('/meetings', { title, meetingType }),

  list: () => api.get<Meeting[]>('/meetings'),

  get: (id: string) => api.get<Meeting>(`/meetings/${id}`),

  start: (id: string) => api.post(`/meetings/${id}/start`),

  stop: (id: string) => api.post(`/meetings/${id}/stop`),
};

export const actionItemsApi = {
  getByMeeting: (meetingId: string) =>
    api.get<ActionItem[]>(`/meetings/${meetingId}/action-items`),

  getUserItems: (status?: string) =>
    api.get<ActionItem[]>('/action-items/user', { params: { status } }),

  updateStatus: (id: string, status: string) =>
    api.patch(`/action-items/${id}/status`, { status }),
};

export default api;
