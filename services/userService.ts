import apiClient from './apiClient';

export interface User {
  id: number;
  nom: string;
  email: string;
  phone?: string | null;
  role: string;
  actif: boolean;
}

export interface UserUpdatePayload {
  nom?: string;
  phone?: string;
}

export const userService = {
  /**
   * Récupère la liste de tous les utilisateurs
   */
  async getUsers(): Promise<User[]> {
    const response = await apiClient.get('/users/');
    return response.data;
  },

  /**
   * Récupère les informations de l'utilisateur connecté
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  /**
   * Met à jour le profil de l'utilisateur connecté
   */
  async updateUserMe(data: UserUpdatePayload): Promise<User> {
    const response = await apiClient.put('/users/me', data);
    return response.data;
  }
};
