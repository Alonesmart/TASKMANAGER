import apiClient from './apiClient';
import { type Message } from './messageService';

export interface Conversation {
  id_conversation: number;
  nom?: string;
  type: string;
  date_creation: string;
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

  /**
   * Récupère l'historique des messages d'une conversation spécifique.
   */
  async getMessages(idConversation: number): Promise<Message[]> {
    const response = await apiClient.get(`/api/v1/comm/conversations/${idConversation}/messages`);
    return response.data;
  }
};
