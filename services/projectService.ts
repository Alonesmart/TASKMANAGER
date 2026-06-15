import apiClient from './apiClient';

export const projectService = {
  /**
   * Récupère un projet spécifique par son ID
   */
  async getProjectById(idProjet: number) {
    const response = await apiClient.get(`/api/v1/core/projets/${idProjet}`);
    return response.data;
  },

  /**
   * Récupère la liste des projets de l'utilisateur
   */
  async getProjects() {
    const response = await apiClient.get('/api/v1/core/projets');
    return response.data;
  },

  /**
   * Récupère la liste des tâches de l'utilisateur
   */
  async getTasks() {
    const response = await apiClient.get('/api/v1/core/taches');
    return response.data;
  },

  /**
   * Crée un nouveau projet
   */
  async createProject(projectData: {
    titre: string;
    description: string;
    dateDebut: string;
    dateFin: string;
    statut: string;
    priorite: string;
    id_administrateur?: number;
  }) {
    const response = await apiClient.post('/api/v1/core/projets', projectData);
    return response.data;
  },

  /**
   * Met à jour un projet existant
   */
  async updateProject(idProjet: number, projectData: any) {
    const response = await apiClient.put(`/api/v1/core/projets/${idProjet}`, projectData);
    return response.data;
  },

  /**
   * Supprime un projet
   */
  async deleteProject(idProjet: number) {
    const response = await apiClient.delete(`/api/v1/core/projets/${idProjet}`);
    return response.data;
  },

  /**
   * Crée une nouvelle équipe pour un projet
   */
  async createTeam(teamData: {
    nom: string;
    description: string;
    id_projet: number;
  }) {
    const response = await apiClient.post('/api/v1/core/equipes', teamData);
    return response.data;
  },

  /**
   * Ajoute une tâche à un projet existant
   */
  async createTask(taskData: any) {
    const response = await apiClient.post('/api/v1/core/taches', taskData);
    return response.data;
  },

  /**
   * Met à jour une tâche existante
   */
  async updateTask(idTache: number, updateData: any) {
    const response = await apiClient.put(`/api/v1/core/taches/${idTache}`, updateData);
    return response.data;
  },

  /**
   * Supprime une tâche
   */
  async deleteTask(idTache: number) {
    const response = await apiClient.delete(`/api/v1/core/taches/${idTache}`);
    return response.data;
  },

  /**
   * Récupère les membres d'une équipe pour un projet donné
   */
  async getTeamMembers(idEquipe: number) {
    const response = await apiClient.get(`/api/v1/core/equipes/${idEquipe}/membres`);
    return response.data;
  },

  /**
   * Ajoute un membre à une équipe
   */
  async addMember(idEquipe: number, idUtilisateur: number) {
    const response = await apiClient.post(`/api/v1/core/equipes/${idEquipe}/membres`, { id_equipe: idEquipe, id_utilisateur: idUtilisateur });
    return response.data;
  },

  /**
   * Synchronise les membres d'une équipe
   */
  async syncTeamMembers(idEquipe: number, userIds: number[]) {
    const response = await apiClient.put(`/api/v1/core/equipes/${idEquipe}/membres`, userIds);
    return response.data;
  }
};
