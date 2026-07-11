import apiClient from './apiClient';

export interface Invitation {
  id: number;
  email_invite: string;
  id_projet: number;
  role_propose: string;
  token: string;
  expires_at: string;
  statut: string;
}

export const invitationService = {
  /**
   * Invite a user to a project.
   */
  async inviteUser(idProjet: number, email: string, role: string): Promise<Invitation> {
    const response = await apiClient.post(`/api/v1/projets/${idProjet}/invitations`, {
      email_invite: email,
      role_propose: role,
    });
    return response.data;
  },

  /**
   * Get the list of pending invitations for a project.
   */
  async getPendingInvitations(idProjet: number): Promise<Invitation[]> {
    const response = await apiClient.get(`/api/v1/projets/${idProjet}/invitations`);
    return response.data;
  },

  /**
   * Get the list of project members and their context roles.
   */
  async getProjectMembers(idProjet: number): Promise<any[]> {
    const response = await apiClient.get(`/api/v1/projets/${idProjet}/membres`);
    return response.data;
  },

  /**
   * Cancel an invitation.
   */
  async cancelInvitation(idInvitation: number): Promise<void> {
    await apiClient.delete(`/api/v1/invitations/${idInvitation}`);
  },

  /**
   * Accept an invitation (creating account if needed).
   */
  async acceptInvitation(token: string, nom?: string, motdepasse?: string): Promise<any> {
    const response = await apiClient.post(`/api/v1/invitations/${token}/accepter`, {
      nom,
      motdepasse,
    });
    return response.data;
  },
};
