import { setStorageItem, getStorageItem, removeStorageItem } from '@/utils/storage';
import apiClient from './apiClient';

export interface AuthResponse {
  access_token: string;
  token_type: string;
  message: string;
}

export interface RegisterPayload {
  nom: string;
  email: string;
  phone?: string;
  motdepasse: string;
  confirm_motdepasse: string;
}

export interface ForgotPasswordResponse {
  message: string;
  reset_token?: string | null;
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
  async register(userData: RegisterPayload): Promise<AuthResponse> {
    const response = await apiClient.post('/register', userData);
    const data = response.data;

    if (data.access_token) {
      await setStorageItem("access_token", data.access_token);
      await setStorageItem("user_email", String(userData.email ?? "").toLowerCase());
    }
    return data;
  },

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    const response = await apiClient.post('/forgot-password', {
      email: email.trim().toLowerCase(),
    });
    return response.data;
  },

  async resetPassword(token: string, newMotdepasse: string, confirmMotdepasse: string): Promise<{ message: string }> {
    const response = await apiClient.post('/reset-password', {
      token: token.trim(),
      new_motdepasse: newMotdepasse,
      confirm_motdepasse: confirmMotdepasse,
    });
    return response.data;
  },

  /**
   * Déconnexion : Nettoie le stockage local
   */
  async logout() {
    await removeStorageItem("access_token");
    await removeStorageItem("session_token");
    await removeStorageItem("user_email");
  },

  /**
   * Vérifie si l'utilisateur est authentifié (check rapide local)
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await getStorageItem("access_token");
    return !!token;
  }
};
