import apiClient from './apiClient';

export interface Report {
  id_rapport: number;
  titre: string;
  contenu: string;
  type: string;
  statut: string;
  date_generation: string;
  id_projet: number;
  id_personnel: number;
}

export interface ReportPayload {
  titre: string;
  contenu: string;
  type: string;
  id_projet: number;
}

export const reportService = {
  async createReport(reportData: ReportPayload): Promise<Report> {
    const response = await apiClient.post('/api/v1/reports/', reportData);
    return response.data;
  },

  async getMyReports(status: string = 'all'): Promise<Report[]> {
    const response = await apiClient.get(`/api/v1/reports/my-reports?statut=${status}`);
    return response.data;
  },

  async updateReportStatus(idRapport: number, newStatus: string): Promise<Report> {
    const response = await apiClient.put(`/api/v1/reports/${idRapport}/statut?nouveau_statut=${newStatus}`);
    return response.data;
  },

  async exportReportPDF(idRapport: number): Promise<Blob> {
    const response = await apiClient.get(`/api/v1/reports/${idRapport}/export-pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
