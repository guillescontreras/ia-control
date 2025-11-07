import axios from 'axios';
import { API_URL } from '../config';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export interface Camera {
  cameraId: string;
  name: string;
  location: string;
  type: 'webcam' | 'ip' | 'rtsp';
  url?: string;
  status: 'active' | 'inactive' | 'error';
  createdAt?: number;
  updatedAt?: number;
}

export const getCameras = async (): Promise<Camera[]> => {
  const response = await api.get('/cameras');
  const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
  return data.cameras || [];
};

export const createCamera = async (camera: Omit<Camera, 'createdAt' | 'updatedAt'>): Promise<Camera> => {
  const response = await api.post('/cameras', camera);
  return response.data;
};

export const deleteCamera = async (cameraId: string): Promise<void> => {
  await api.delete(`/cameras/${cameraId}`);
};

export default api;
