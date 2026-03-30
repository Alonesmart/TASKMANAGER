import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export interface Task {
  task_id: string;
  title: string;
  description?: string;
  project_id?: string;
  assigned_to?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'completed';
  start_date?: string;
  end_date?: string;
  attachments: Attachment[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  attachment_id: string;
  filename: string;
  content_type: string;
  data: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface Project {
  project_id: string;
  name: string;
  description?: string;
  members: string[];
  created_by: string;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
}

export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  role: string;
  created_at: string;
}

export interface Comment {
  comment_id: string;
  task_id: string;
  user_id: string;
  content: string;
  mentions: string[];
  created_at: string;
}

export interface Notification {
  notification_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  task_id?: string;
  read: boolean;
  created_at: string;
}

export interface ActionHistory {
  action_id: string;
  task_id: string;
  user_id: string;
  action_type: string;
  details: Record<string, any>;
  created_at: string;
}

export interface DashboardStats {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  todo_tasks: number;
  my_tasks: number;
  active_projects: number;
  completed_projects: number;
  high_priority_tasks: number;
  unread_notifications: number;
  due_soon: number;
  completion_rate: number;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('session_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }

  return response.json();
}

// Dashboard
export const getDashboardStats = () => apiRequest<DashboardStats>('/api/dashboard/stats');
export const getTeamPerformance = (projectId?: string) =>
  apiRequest<any[]>(`/api/dashboard/team-performance${projectId ? `?project_id=${projectId}` : ''}`);

// Projects
export const getProjects = (status?: string) =>
  apiRequest<Project[]>(`/api/projects${status ? `?status=${status}` : ''}`);
export const getProject = (id: string) => apiRequest<Project>(`/api/projects/${id}`);
export const createProject = (data: Partial<Project>) =>
  apiRequest<Project>('/api/projects', { method: 'POST', body: JSON.stringify(data) });
export const updateProject = (id: string, data: Partial<Project>) =>
  apiRequest<Project>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteProject = (id: string) =>
  apiRequest<{ message: string }>(`/api/projects/${id}`, { method: 'DELETE' });

// Tasks
export interface TaskFilters {
  project_id?: string;
  assigned_to?: string;
  status?: string;
  priority?: string;
  search?: string;
}

export const getTasks = (filters?: TaskFilters) => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
  }
  const query = params.toString();
  return apiRequest<Task[]>(`/api/tasks${query ? `?${query}` : ''}`);
};

export const getTask = (id: string) => apiRequest<Task>(`/api/tasks/${id}`);
export const createTask = (data: Partial<Task>) =>
  apiRequest<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(data) });
export const updateTask = (id: string, data: Partial<Task>) =>
  apiRequest<Task>(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTask = (id: string) =>
  apiRequest<{ message: string }>(`/api/tasks/${id}`, { method: 'DELETE' });

// Attachments
export const addAttachment = async (taskId: string, file: { uri: string; name: string; type: string }) => {
  const authHeaders = await getAuthHeaders();
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);

  const response = await fetch(`${API_URL}/api/tasks/${taskId}/attachments`, {
    method: 'POST',
    headers: authHeaders,
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload attachment');
  }

  return response.json();
};

export const deleteAttachment = (taskId: string, attachmentId: string) =>
  apiRequest<{ message: string }>(`/api/tasks/${taskId}/attachments/${attachmentId}`, { method: 'DELETE' });

// Comments
export const getComments = (taskId: string) => apiRequest<Comment[]>(`/api/tasks/${taskId}/comments`);
export const createComment = (taskId: string, data: { content: string; mentions?: string[] }) =>
  apiRequest<Comment>(`/api/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify(data) });

// Task History
export const getTaskHistory = (taskId: string) => apiRequest<ActionHistory[]>(`/api/tasks/${taskId}/history`);

// Users
export const getUsers = () => apiRequest<User[]>('/api/users');
export const getUser = (id: string) => apiRequest<User>(`/api/users/${id}`);
export const updateUser = (id: string, data: Partial<User>) =>
  apiRequest<User>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });

// Notifications
export const getNotifications = (unreadOnly?: boolean) =>
  apiRequest<Notification[]>(`/api/notifications${unreadOnly ? '?unread_only=true' : ''}`);
export const markNotificationRead = (id: string) =>
  apiRequest<{ message: string }>(`/api/notifications/${id}/read`, { method: 'PUT' });
export const markAllNotificationsRead = () =>
  apiRequest<{ message: string }>('/api/notifications/read-all', { method: 'PUT' });
