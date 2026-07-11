import apiClient from './apiClient';

export interface MeetingParticipant {
  id_utilisateur: number;
  nom: string;
  email: string;
  statut: string; // 'invite' | 'confirme' | 'decline'
}

export interface Meeting {
  id_reunion: number;
  titre: string;
  date: string;
  lien_virtuel: string | null;
  ordre_jour: string | null;
  compte_rendu: string | null;
  id_projet: number;
  invitations: MeetingParticipant[];
}

export interface MeetingPayload {
  titre: string;
  date: string;
  lien_virtuel?: string | null;
  ordre_jour?: string | null;
  id_projet: number;
  invited_user_ids: number[];
}

export const meetingService = {
  async createMeeting(payload: MeetingPayload): Promise<Meeting> {
    const response = await apiClient.post('/api/v1/reunions', payload);
    return response.data;
  },

  async getMeetings(idProjet?: number): Promise<Meeting[]> {
    let url = '/api/v1/reunions';
    if (idProjet !== undefined) {
      url += `?id_projet=${idProjet}`;
    }
    const response = await apiClient.get(url);
    return response.data;
  },

  async respondInvitation(idReunion: number, statut: 'confirme' | 'decline'): Promise<void> {
    await apiClient.put(`/api/v1/reunions/${idReunion}/reponse`, { statut });
  },
};
