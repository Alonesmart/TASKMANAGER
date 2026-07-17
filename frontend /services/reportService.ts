import apiClient from './apiClient';

export interface HistoriqueRapport {
  id_historique: number;
  id_rapport: number;
  ancien_statut: string;
  nouveau_statut: string;
  id_acteur: number;
  date: string;
  commentaire?: string | null;
}

export interface Report {
  id_rapport: number;
  titre: string;
  contenu: string;
  type: string;
  statut: string;
  date_generation: string;
  date_soumission?: string | null;
  date_validation?: string | null;
  commentaire_validation?: string | null;
  id_projet: number;
  id_personnel: number;
  id_tache?: number | null;
  historique?: HistoriqueRapport[];
}

export interface ReportPayload {
  titre: string;
  contenu: string;
  type: string;
  id_projet: number;
  id_tache?: number | null;
}

export const reportService = {
  async createReport(reportData: ReportPayload): Promise<Report> {
    const response = await apiClient.post('/api/v1/reports/', reportData);
    return response.data;
  },

  async updateReport(idRapport: number, reportData: ReportPayload): Promise<Report> {
    const response = await apiClient.put(`/api/v1/reports/${idRapport}`, reportData);
    return response.data;
  },

  async getReportDetails(idRapport: number): Promise<Report> {
    const response = await apiClient.get(`/api/v1/reports/${idRapport}`);
    return response.data;
  },

  async getMyReports(status: string = 'all'): Promise<Report[]> {
    const response = await apiClient.get(`/api/v1/reports/my-reports?statut=${status}`);
    return response.data;
  },

  async getReportsToValidate(): Promise<Report[]> {
    const response = await apiClient.get('/api/v1/reports/to-validate');
    return response.data;
  },

  async submitReport(idRapport: number): Promise<Report> {
    const response = await apiClient.put(`/api/v1/reports/${idRapport}/soumettre`);
    return response.data;
  },

  async validateReport(idRapport: number, comment?: string): Promise<Report> {
    const response = await apiClient.put(`/api/v1/reports/${idRapport}/valider`, { commentaire: comment });
    return response.data;
  },

  async rejectReport(idRapport: number, comment: string): Promise<Report> {
    const response = await apiClient.put(`/api/v1/reports/${idRapport}/rejeter`, { commentaire: comment });
    return response.data;
  },

  async getReportHistory(idRapport: number): Promise<HistoriqueRapport[]> {
    const response = await apiClient.get(`/api/v1/reports/${idRapport}/historique`);
    return response.data;
  },

  async exportReportPDF(idRapport: number): Promise<Blob> {
    const response = await apiClient.get(`/api/v1/reports/${idRapport}/export-pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async getReportStats(): Promise<ReportStats> {
    const response = await apiClient.get('/api/v1/reports/stats/dashboard');
    return response.data;
  },
};

export interface ProjectStats {
  id_projet: number;
  titre_projet: string;
  total: number;
  valide: number;
  en_attente: number;
}

export interface ReportStats {
  total: number;
  brouillon: number;
  soumis: number;
  valide: number;
  rejete: number;
  delai_moyen_validation_heures: number;
  projets_stats: ProjectStats[];
}
