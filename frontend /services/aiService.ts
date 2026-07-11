import apiClient from './apiClient';

export interface IASuggestionResponse {
  description: string;
}

export interface IAPriorityResponse {
  priorite: string;
}

export interface IAAllocationItem {
  id_tache: number;
  id_utilisateur: number;
}

export interface IAAllocationResponse {
  repartition: IAAllocationItem[];
}

export interface IARiskItem {
  id_tache: number;
  titre: string;
  statut: string;
  risque: string; // 'faible' | 'moyen' | 'eleve'
  raison: string;
}

export interface IARiskResponse {
  risques: IARiskItem[];
}

export const aiService = {
  async suggestDescription(titre: string, type: 'tache' | 'projet' = 'tache'): Promise<IASuggestionResponse> {
    const response = await apiClient.post('/api/v1/ia/rediger-description', { titre, type });
    return response.data;
  },

  async suggestPriority(titre: string, description?: string, dateEcheance?: string): Promise<IAPriorityResponse> {
    const response = await apiClient.post('/api/v1/ia/suggerer-priorite', {
      titre,
      description: description || null,
      date_echeance: dateEcheance || null,
    });
    return response.data;
  },

  async suggestAllocation(idProjet: number, tacheIds: number[]): Promise<IAAllocationResponse> {
    const response = await apiClient.post('/api/v1/ia/repartir-taches', {
      id_projet: idProjet,
      tache_ids: tacheIds,
    });
    return response.data;
  },

  async getProjectRisks(idProjet: number): Promise<IARiskResponse> {
    const response = await apiClient.get(`/api/v1/ia/risques-retard?id_projet=${idProjet}`);
    return response.data;
  },
};
