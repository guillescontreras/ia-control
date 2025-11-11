import axios from 'axios';
import { API_URL } from '../config';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export interface Employee {
  empleadoId: string;
  nombre: string;
  apellido: string;
  departamento: string;
  faceId: string;
  activo: boolean;
  fechaAlta: number;
  imageUrl: string;
}

export interface AccessLog {
  timestamp: number;
  empleadoId: string;
  nombreCompleto?: string;
  cameraId: string;
  tipo: 'ingreso' | 'egreso';
  objetos: string[];
  confianza: number;
}

export interface Alert {
  alertId: string;
  timestamp: number;
  tipo: string;
  cameraId: string;
  descripcion: string;
  resuelta: boolean;
  type?: string;
  severity?: 'high' | 'medium' | 'low';
  message?: string;
  imageUrl?: string;
  zoneName?: string;
  details?: {
    personsDetected?: number;
    compliancePercentage?: number;
    missingEPP?: string[];
  };
}

export interface Stats {
  ingresos: number;
  egresos: number;
  presentes: number;
  alertas: number;
}

export const getUploadUrl = async (filename: string, filetype: string) => {
  const response = await api.post('/upload-presigned', { filename, filetype });
  const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
  return data.body ? JSON.parse(data.body) : data;
};

export const registerEmployee = async (data: any) => {
  const response = await api.post('/register-employee', data);
  return response.data;
};

export const getLogs = async (limit: number = 50) => {
  const response = await api.get('/logs', { params: { limit } });
  const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
  return data.body ? JSON.parse(data.body) : data;
};

export const getEmployees = async () => {
  const response = await api.get('/employees');
  const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
  return data.body ? JSON.parse(data.body) : data;
};

export const getAlerts = async () => {
  const response = await api.get('/alerts', { params: { resuelta: 'false' } });
  const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
  return data.body ? JSON.parse(data.body) : data;
};

export const getStats = async (): Promise<Stats> => {
  const response = await api.get('/stats');
  const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
  return data.body ? JSON.parse(data.body) : data;
};

export default api;
