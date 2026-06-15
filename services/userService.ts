import apiClient from './apiClient';

export const userService = {
  /**
   * Récupère la liste de tous les utilisateurs
   */
  async getUsers() {
    const response = await apiClient.get('/users/');
    return response.data;
  },

  /**
   * Récupère les informations de l'utilisateur connecté
   */
  async getCurrentUser() {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  /**
   * Met à jour le profil de l'utilisateur connecté
   */
  async updateUserMe(data: { nom?: string; phone?: string }) {
    const response = await apiClient.put('/users/me', data);
    return response.data;
  }
};
