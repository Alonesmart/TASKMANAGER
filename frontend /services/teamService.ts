import apiClient from './apiClient';
import type { User } from './userService';

export interface Team {
  id_equipe: number;
  nom: string;
  description?: string | null;
  id_projet: number;
}

export interface TeamPayload {
  nom: string;
  description?: string | null;
  id_projet: number;
}

export interface TeamMemberPayload {
  id_equipe: number;
  id_utilisateur: number;
}

export interface SyncTeamMembersResponse {
  message: string;
  count: number;
}

export const teamService = {
  async createTeam(teamData: TeamPayload): Promise<Team> {
    const response = await apiClient.post('/api/v1/core/equipes/', teamData);
    return response.data;
  },

  async getTeamMembers(idEquipe: number): Promise<User[]> {
    const response = await apiClient.get(`/api/v1/core/equipes/${idEquipe}/membres`);
    return response.data;
  },

  async addMember(idEquipe: number, idUtilisateur: number): Promise<TeamMemberPayload> {
    const response = await apiClient.post(`/api/v1/core/equipes/${idEquipe}/membres`, {
      id_equipe: idEquipe,
      id_utilisateur: idUtilisateur,
    });
    return response.data;
  },

  async removeMember(idEquipe: number, idUtilisateur: number): Promise<void> {
    await apiClient.delete(`/api/v1/core/equipes/${idEquipe}/membres/${idUtilisateur}`);
  },

  async syncTeamMembers(idEquipe: number, userIds: number[]): Promise<SyncTeamMembersResponse> {
    const response = await apiClient.put(`/api/v1/core/equipes/${idEquipe}/membres`, userIds);
    return response.data;
  },
};
