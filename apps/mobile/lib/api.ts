import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.3.136:3000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface User {
  id: string;
  email: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  full_name?: string;
  country?: string;
  timezone?: string;
  preferred_language?: string;
  output_language?: string;
  date_format?: string;
  time_format?: string;
  use_case?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Meeting {
  id: string;
  user_id: string;
  title: string;
  status: 'draft' | 'recording' | 'processing' | 'completed' | 'failed';
  meeting_type?: string;
  output_language?: string;
  duration_seconds?: number;
  audio_url?: string;
  started_at?: string;
  ended_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ActionItem {
  id: string;
  meeting_id: string;
  task: string;
  assignee?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  created_at?: string;
  updated_at?: string;
}

export interface TranscriptSegment {
  id: string;
  speaker: string;
  text: string;
  start_time: number;
  end_time: number;
  confidence?: number;
  language?: string;
}

export interface MeetingSummary {
  id: string;
  meeting_id: string;
  summary_text: string;
  executive_summary?: string;
  key_points?: string[];
  decisions?: string[];
  topics?: string[];
  created_at?: string;
}

export interface UserProfileResponse {
  user: User;
  profile: UserProfile;
}

export const authApi = {
  register: (email: string, password: string, fullName?: string) =>
    api.post<AuthResponse>('/auth/register', { email, password, fullName }),

  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),

  getProfile: () =>
    api.get<UserProfileResponse>('/auth/profile'),

  updateProfile: (profile: Partial<UserProfile>) =>
    api.put<UserProfileResponse>('/auth/profile', profile),

  logout: () =>
    api.post('/auth/logout'),
};

export const meetingsApi = {
  list: () =>
    api.get<Meeting[]>('/meetings'),

  get: (id: string) =>
    api.get<Meeting>(`/meetings/${id}`),

  create: (data: { title: string; meetingType?: string; outputLanguage?: string }) =>
    api.post<Meeting>('/meetings', data),

  update: (id: string, data: Partial<Meeting>) =>
    api.patch<Meeting>(`/meetings/${id}`, data),

  start: (id: string) =>
    api.post<{ status: string }>(`/meetings/${id}/start`),

  stop: (id: string) =>
    api.post<{ status: string }>(`/meetings/${id}/stop`),

  process: (id: string) =>
    api.post<{ status: string }>(`/meetings/${id}/process`),

  delete: (id: string) =>
    api.delete(`/meetings/${id}`),

  search: (query: string) =>
    api.get<Meeting[]>(`/meetings/search?q=${encodeURIComponent(query)}`),

  getSummary: (id: string) =>
    api.get<MeetingSummary>(`/meetings/${id}/summary`),

  getTranscript: (id: string) =>
    api.get<TranscriptSegment[]>(`/transcripts/meeting/${id}`),

  getActionItems: (id: string) =>
    api.get<ActionItem[]>(`/action-items/meeting/${id}`),
};

export const actionItemsApi = {
  listByMeeting: (meetingId: string) =>
    api.get<ActionItem[]>(`/action-items/meeting/${meetingId}`),

  getUserItems: (status?: string) =>
    api.get<ActionItem[]>(`/action-items/user/items${status ? `?status=${status}` : ''}`),

  create: (meetingId: string, item: { task: string; assignee?: string; dueDate?: string; priority?: string }) =>
    api.post<ActionItem>(`/action-items/meeting/${meetingId}`, item),

  updateStatus: (id: string, status: 'pending' | 'in_progress' | 'completed') =>
    api.patch<ActionItem>(`/action-items/${id}/status`, { status }),

  delete: (id: string) =>
    api.delete(`/action-items/${id}`),
};

export const transcriptsApi = {
  getByMeetingId: (meetingId: string) =>
    api.get<TranscriptSegment[]>(`/transcripts/meeting/${meetingId}`),
};

export default api;
