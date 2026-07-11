import apiClient from './apiClient';

export interface Message {
  id_message: number;
  contenu: string;
  type_conversation: string;
  id_expediteur: number;
  id_ia: number | null;
  date_envoi: string;
  lu: boolean;
}

export interface MessagePayload {
  contenu: string;
  type_conversation: string;
  id_expediteur: number;
  id_conversation?: number;
  id_assistant?: number | null;
}

export interface Notification {
  id_notification: number;
  message: string;
  lu: boolean;
  date_envoi: string;
  id_utilisateur: number;
  id_tache?: number | null;
}

export interface NotificationCount {
  count: number;
}

export const messageService = {
  // --- MESSAGES ---

  async getMessages(): Promise<Message[]> {
    const response = await apiClient.get('/api/v1/comm/messages/conversations');
    return response.data;
  },

  async sendMessage(messageData: MessagePayload): Promise<Message> {
    const response = await apiClient.post('/api/v1/comm/messages', messageData);
    return response.data;
  },

  async markMessageAsRead(idMessage: number): Promise<Message> {
    const response = await apiClient.put(`/api/v1/comm/messages/${idMessage}/lire`);
    return response.data;
  },

  // --- NOTIFICATIONS ---

  async getNotifications(userId: number): Promise<Notification[]> {
    const response = await apiClient.get(`/api/v1/comm/notifications/utilisateur/${userId}`);
    return response.data;
  },

  async getUnreadNotificationsCount(userId: number): Promise<NotificationCount> {
    const response = await apiClient.get(`/api/v1/comm/notifications/utilisateur/${userId}/non-lues/count`);
    return response.data;
  },

  async markNotificationAsRead(idNotification: number): Promise<Notification> {
    const response = await apiClient.put(`/api/v1/comm/notifications/${idNotification}/lire`);
    return response.data;
  },
};
