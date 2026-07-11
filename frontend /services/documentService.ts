import apiClient from './apiClient';
import { API_URL } from '@/constants/API_URL';

export interface Document {
  id: number;
  nom_original: string;
  nom_stocke: string;
  type_mime: string;
  taille: number;
  chemin: string;
  id_projet: number | null;
  id_tache: number | null;
  id_uploader: number;
  date_upload: string;
}

export const documentService = {
  /**
   * Upload a document with optional project and task link, tracking progress.
   */
  async uploadDocument(
    fileUri: string,
    fileName: string,
    mimeType: string,
    idProjet?: number | null,
    idTache?: number | null,
    onProgress?: (progress: number) => void
  ): Promise<Document> {
    const formData = new FormData();
    
    // In React Native, the file is appended as an object containing uri, name, and type
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any);

    if (idProjet) {
      formData.append('id_projet', idProjet.toString());
    }
    if (idTache) {
      formData.append('id_tache', idTache.toString());
    }

    const response = await apiClient.post('/api/v1/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  },

  /**
   * Get the list of documents for a project.
   */
  async getDocumentsByProject(idProjet: number): Promise<Document[]> {
    const response = await apiClient.get(`/api/v1/documents?id_projet=${idProjet}`);
    return response.data;
  },

  /**
   * Get the list of documents for a task.
   */
  async getDocumentsByTask(idTache: number): Promise<Document[]> {
    const response = await apiClient.get(`/api/v1/documents?id_tache=${idTache}`);
    return response.data;
  },

  /**
   * Return the direct download URL for a document.
   */
  getDownloadUrl(id: number): string {
    return `${API_URL}/api/v1/documents/${id}`;
  },

  /**
   * Delete a document.
   */
  async deleteDocument(id: number): Promise<void> {
    await apiClient.delete(`/api/v1/documents/${id}`);
  },
};
