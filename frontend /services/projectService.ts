import apiClient from './apiClient';
import { taskService, type TaskPayload, type TaskUpdatePayload } from './taskService';
import { teamService, type Team } from './teamService';

export interface Project {
  id_projet: number;
  titre: string;
  description?: string | null;
  dateDebut: string;
  dateFin: string;
  priorite: string;
  statut: string;
  etat: string;
  id_administrateur?: number | null;
  equipe?: Team | null;
  couleur?: string;
  icone?: string;
}

export interface ProjectPayload {
  titre: string;
  description?: string | null;
  dateDebut: string;
  dateFin: string;
  statut: string;
  priorite: string;
  etat?: string;
  id_administrateur?: number;
}

export const projectService = {
  /**
   * Récupère un projet spécifique par son ID
   */
  async getProjectById(idProjet: number): Promise<Project> {
    const response = await apiClient.get(`/api/v1/core/projets/${idProjet}`);
    return response.data;
  },

  /**
   * Récupère la liste des projets de l'utilisateur
   */
  async getProjects(): Promise<Project[]> {
    const response = await apiClient.get('/api/v1/core/projets/');
    return response.data;
  },

  /**
   * Récupère la liste des tâches de l'utilisateur
   */
  async getTasks() {
    return taskService.getTasks();
  },

  /**
   * Crée un nouveau projet
   */
  async createProject(projectData: ProjectPayload): Promise<Project> {
    const response = await apiClient.post('/api/v1/core/projets/', projectData);
    return response.data;
  },

  /**
   * Met à jour un projet existant
   */
  async updateProject(idProjet: number, projectData: ProjectPayload): Promise<Project> {
    const response = await apiClient.put(`/api/v1/core/projets/${idProjet}`, projectData);
    return response.data;
  },

  /**
   * Supprime un projet
   */
  async deleteProject(idProjet: number): Promise<void> {
    await apiClient.delete(`/api/v1/core/projets/${idProjet}`);
  },

  /**
   * Crée une nouvelle équipe pour un projet
   */
  async createTeam(teamData: {
    nom: string;
    description: string;
    id_projet: number;
  }) {
    return teamService.createTeam(teamData);
  },

  /**
   * Ajoute une tâche à un projet existant
   */
  async createTask(taskData: TaskPayload) {
    return taskService.createTask(taskData);
  },

  /**
   * Met à jour une tâche existante
   */
  async updateTask(idTache: number, updateData: TaskUpdatePayload) {
    return taskService.updateTask(idTache, updateData);
  },

  /**
   * Supprime une tâche
   */
  async deleteTask(idTache: number) {
    return taskService.deleteTask(idTache);
  },

  /**
   * Récupère les membres d'une équipe pour un projet donné
   */
  async getTeamMembers(idEquipe: number) {
    return teamService.getTeamMembers(idEquipe);
  },

  /**
   * Ajoute un membre à une équipe
   */
  async addMember(idEquipe: number, idUtilisateur: number) {
    return teamService.addMember(idEquipe, idUtilisateur);
  },

  /**
   * Synchronise les membres d'une équipe
   */
  async syncTeamMembers(idEquipe: number, userIds: number[]) {
    return teamService.syncTeamMembers(idEquipe, userIds);
  },

  /**
   * Récupère les statistiques globales pour le dashboard d'accueil
   */
  async getGlobalDashboard() {
    const response = await apiClient.get('/api/v1/dashboard/global');
    return response.data;
  }
};
