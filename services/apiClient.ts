import axios from 'axios';
import { API_URL } from '@/constants/API_URL';
import { getStorageItem, removeStorageItem } from '@/utils/storage';
import { router } from 'expo-router';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token à chaque requête
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getStorageItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs (notamment 401)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Unauthorized (401), redirecting to login...');
      await removeStorageItem('access_token');
      // Redirection globale vers la page de connexion
      router.replace("/(tabs)/Authentification/Connexion");
    }
    return Promise.reject(error);
  }
);

export default apiClient;
