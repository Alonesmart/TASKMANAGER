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
  async getTasks(filters?: {
    id_projet?: number;
    statut?: string;
    priorite?: string;
    date_echeance?: string;
  }): Promise<Task[]> {
    let url = '/api/v1/core/taches/';
    if (filters) {
      const params = new URLSearchParams();
      if (filters.id_projet !== undefined) params.append('id_projet', filters.id_projet.toString());
      if (filters.statut !== undefined) params.append('statut', filters.statut);
      if (filters.priorite !== undefined) params.append('priorite', filters.priorite);
      if (filters.date_echeance !== undefined) params.append('date_echeance', filters.date_echeance);
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    const response = await apiClient.get(url);
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
