import apiClient from './apiClient';

export interface HomeDashboardData {
  active_projects: number;
  my_tasks: number;
  urgent_tasks: number;
  due_soon_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  todo_tasks: number;
  progression: number;
}

export const homeService = {
  async getDashboardData(): Promise<HomeDashboardData> {
    const response = await apiClient.get('/api/v1/dashboard/global');
    return response.data;
  },
};
