import apiClient from './apiClient';
import { type Message } from './messageService';

export interface Participant {
  id_utilisateur: number;
  utilisateur: {
    id: number;
    nom: string;
    email: string;
    role: string;
  };
}

export interface Conversation {
  id_conversation: number;
  nom?: string;
  type: string;
  date_creation: string;
  participants?: Participant[];
}

export interface ConversationWithLastMessage extends Conversation {
  last_message?: {
    contenu: string;
    date_envoi: string;
  };
  unread_count?: number;
}

export const conversationService = {
  /**
   * Crée une nouvelle conversation avec une liste de participants.
   */
  async createConversation(data: {
    nom?: string;
    type: 'direct' | 'groupe';
    participant_ids: number[];
  }): Promise<Conversation> {
    const response = await apiClient.post('/api/v1/comm/conversations', data);
    return response.data;
  },

  /**
   * Récupère toutes les conversations auxquelles l'utilisateur appartient.
   */
  async getMyConversations(): Promise<Conversation[]> {
    const response = await apiClient.get('/api/v1/comm/conversations/me');
    return response.data;
  },

  async getMessages(idConversation: number): Promise<Message[]> {
    const response = await apiClient.get(`/api/v1/comm/conversations/${idConversation}/messages`);
    return response.data;
  },

  /**
   * Récupère les détails d'une conversation spécifique.
   */
  async getConversation(idConversation: number): Promise<Conversation> {
    const response = await apiClient.get(`/api/v1/comm/conversations/${idConversation}`);
    return response.data;
  },

  /**
   * Marque tous les messages d'une conversation comme lus.
   */
  async markAsRead(idConversation: number): Promise<any> {
    const response = await apiClient.put(`/api/v1/comm/conversations/${idConversation}/lire`);
    return response.data;
  },

  async deleteConversation(idConversation: number): Promise<any> {
    const response = await apiClient.delete(`/api/v1/comm/conversations/${idConversation}`);
    return response.data;
  }
};
