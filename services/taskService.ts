import apiClient from './apiClient';
import type { Project } from './projectService';
import type { User } from './userService';

export interface Task {
  id_tache: number;
  titre: string;
  description: string | null;
  priorite: string;
  statut: string;
  echeance: string | null;
  progression: number;
  etat: string;
  id_projet: number;
  projet?: Project | null;
  assigned_users?: User[];
}

export interface TaskPayload {
  titre: string;
  description?: string | null;
  priorite?: string;
  statut?: string;
  echeance?: string | null;
  progression?: number;
  etat?: string;
  id_projet: number;
  assigned_user_ids?: number[];
}

export interface TaskUpdatePayload {
  titre?: string;
  description?: string | null;
  priorite?: string;
  statut?: string;
  echeance?: string | null;
  progression?: number;
  etat?: string;
  assigned_user_ids?: number[];
}

export const taskService = {
  async getTasks(): Promise<Task[]> {
    const response = await apiClient.get('/api/v1/core/taches/');
    return response.data.map((task: Task) => ({
      ...task,
      assigned_users: task.assigned_users ?? [],
    }));
  },

  async createTask(taskData: TaskPayload): Promise<Task> {
    const response = await apiClient.post('/api/v1/core/taches/', taskData);
    return {
      ...response.data,
      assigned_users: response.data.assigned_users ?? [],
    };
  },

  async updateTask(idTache: number, updateData: TaskUpdatePayload): Promise<Task> {
    const response = await apiClient.put(`/api/v1/core/taches/${idTache}`, updateData);
    return {
      ...response.data,
      assigned_users: response.data.assigned_users ?? [],
    };
  },

  async deleteTask(idTache: number): Promise<void> {
    await apiClient.delete(`/api/v1/core/taches/${idTache}`);
  },
};
