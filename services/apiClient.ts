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
    try {
      const token = await getStorageItem('access_token');
      if (token) {
        // Utilisation de .set() pour plus de robustesse avec Axios 1.x
        if (config.headers && typeof config.headers.set === 'function') {
          config.headers.set('Authorization', `Bearer ${token}`);
        } else {
          // Fallback pour les versions d'Axios où headers est un objet simple
          config.headers = config.headers || {};
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error('Error in request interceptor:', error);
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
    const originalRequest = error.config;
    
    if (error.response && error.response.status === 401) {
      console.warn(`Unauthorized (401) on ${originalRequest?.url}, redirecting to login...`);
      
      // On évite de boucler si on est déjà sur le login ou register
      const isAuthRoute = originalRequest?.url?.includes('/login') || originalRequest?.url?.includes('/register');
      
      if (!isAuthRoute) {
        await removeStorageItem('access_token');
        // Redirection globale vers la page de connexion
        router.replace("/(tabs)/Authentification/Connexion");
      } else {
        console.warn('401 error on auth route - likely invalid credentials');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
