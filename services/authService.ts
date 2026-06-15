import { setStorageItem, getStorageItem, removeStorageItem } from '@/utils/storage';
import apiClient from './apiClient';

export interface AuthResponse {
  access_token: string;
  token_type: string;
  message: string;
}

export const authService = {
  /**
   * Connecte l'utilisateur et stocke le token
   */
  async login(email: string, motdepasse: string): Promise<AuthResponse> {
    const response = await apiClient.post('/login', { email, motdepasse });
    const data = response.data;
    
    if (data.access_token) {
      await setStorageItem("access_token", data.access_token);
      await setStorageItem("user_email", email.toLowerCase());
    }
    return data;
  },

  /**
   * Inscrit un nouvel utilisateur
   */
  async register(userData: any): Promise<AuthResponse> {
    const response = await apiClient.post('/register', userData);
    const data = response.data;

    if (data.access_token) {
      await setStorageItem("access_token", data.access_token);
    }
    return data;
  },

  /**
   * Déconnexion : Nettoie le stockage local
   */
  async logout() {
    await removeStorageItem("access_token");
    await removeStorageItem("session_token");
  },

  /**
   * Vérifie si l'utilisateur est authentifié (check rapide local)
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await getStorageItem("access_token");
    return !!token;
  }
};
