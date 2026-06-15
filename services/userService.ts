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
  }
};
