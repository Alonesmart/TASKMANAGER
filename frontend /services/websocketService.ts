import { getStorageItem } from '@/utils/storage';
import apiClient from './apiClient';

interface WebSocketMessage {
  type: string;
  id_message?: number;
  contenu?: string;
  type_conversation?: string;
  id_expediteur?: number;
  id_ia?: number;
  date_envoi?: string;
  lu?: boolean;
  id_notification?: number;
}

type MessageCallback = (message: WebSocketMessage) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private callbacks: Set<MessageCallback> = new Set();
  private userId: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    // Base URL from API client or environment
    // Assuming the API base URL is something like http://localhost:8000/api/v1
    // We need to replace http with ws for WebSockets
    const baseUrl = (apiClient as any).defaults?.baseURL || 'http://localhost:8000/api/v1';
    this.url = baseUrl.replace(/^http/, 'ws');
  }

  async connect(userId: number): Promise<void> {
    this.userId = userId;
    const token = await getStorageItem("access_token");
    
    // Ensure the WebSocket path has the '/api/v1' prefix if it is not already included in the base URL
    let baseWsUrl = this.url.replace(/\/$/, '');
    if (!baseWsUrl.includes('/api/v1')) {
      baseWsUrl += '/api/v1';
    }
    
    const wsUrl = `${baseWsUrl}/comm/ws/${userId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    return new Promise((resolve, reject) => {
      try {
        console.log(`[WebSocket] Attempting connection to: ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          const data: WebSocketMessage = JSON.parse(event.data);
          this.callbacks.forEach(callback => callback(data));
        };

        this.ws.onclose = (e) => {
          console.log(`[WebSocket] Disconnected: ${e.reason}`);
          this.handleReconnect();
        };

        this.ws.onerror = (e) => {
          console.error('[WebSocket] Error event:', e);
          reject(e);
        };
      } catch (error) {
        console.error('[WebSocket] Error before open:', error);
        reject(error);
      }
    });
  }

  private handleReconnect() {
    if (this.userId && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
      console.log(`[WebSocket] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);
      setTimeout(() => this.connect(this.userId!), delay);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.callbacks.clear();
  }

  subscribe(callback: MessageCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  send(message: any): void {
    if (this.ws && this.isConnected()) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message, WebSocket is not connected');
    }
  }
}

export const websocketService = new WebSocketService();
