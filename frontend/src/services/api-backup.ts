import axios from 'axios';
import { apiConfig } from '../config/constants';
import type { Music } from '../types/music';

// Create axios instance
const api = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for handling API responses
api.interceptors.response.use(
  (response: any) => response.data,
  (error: any) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Minister {
  id: string;
  nome: string;
  email: string;
  instrumento: string;
  status: 'ativo' | 'inativo';
  createdAt: string;
}

export interface User {
  id: string;
  nome: string;
  email: string;
  role: 'admin' | 'user';
  status: 'ativo' | 'inativo';
  createdAt: string;
}

export interface Setlist {
  id: string;
  nome: string;
  data: string;
  musicas: string[];
  ministro: string;
  observacoes?: string;
}

// Music API
export const musicApi = {
  // Get all music
  getAll: (): Promise<ApiResponse<Music[]>> => api.get('/music'),
  
  // Get music by ID
  getById: (id: string): Promise<ApiResponse<Music>> => api.get(`/music/${id}`),
  
  // Create music
  create: (music: Omit<Music, 'id' | 'createdAt'>): Promise<ApiResponse<Music>> => 
    api.post('/music', music),
  
  // Update music
  update: (id: string, music: Partial<Music>): Promise<ApiResponse<Music>> => 
    api.put(`/music/${id}`, music),
  
  // Delete music
  delete: (id: string): Promise<ApiResponse<void>> => api.delete(`/music/${id}`),
  
  // Search music
  search: (query: string): Promise<ApiResponse<Music[]>> => 
    api.get('/music', { params: { search: query } }),
};

// Ministers API
export const ministersApi = {
  // Get all ministers
  getAll: (): Promise<ApiResponse<Minister[]>> => api.get('/ministers'),
  
  // Get minister by ID
  getById: (id: string): Promise<ApiResponse<Minister>> => api.get(`/ministers/${id}`),
  
  // Create minister
  create: (minister: Omit<Minister, 'id' | 'createdAt'>): Promise<ApiResponse<Minister>> => 
    api.post('/ministers', minister),
  
  // Update minister
  update: (id: string, minister: Partial<Minister>): Promise<ApiResponse<Minister>> => 
    api.put(`/ministers/${id}`, minister),
  
  // Delete minister
  delete: (id: string): Promise<ApiResponse<void>> => api.delete(`/ministers/${id}`),
};

// Users API
export const usersApi = {
  // Get all users
  getAll: (): Promise<ApiResponse<User[]>> => api.get('/users'),
  
  // Get user by ID
  getById: (id: string): Promise<ApiResponse<User>> => api.get(`/users/${id}`),
  
  // Create user
  create: (user: Omit<User, 'id' | 'createdAt'>): Promise<ApiResponse<User>> => 
    api.post('/users', user),
  
  // Update user
  update: (id: string, user: Partial<User>): Promise<ApiResponse<User>> => 
    api.put(`/users/${id}`, user),
  
  // Delete user
  delete: (id: string): Promise<ApiResponse<void>> => api.delete(`/users/${id}`),
};

// Setlists API
export const setlistsApi = {
  // Get all setlists
  getAll: (): Promise<ApiResponse<Setlist[]>> => api.get('/setlists'),
  
  // Get setlist by ID
  getById: (id: string): Promise<ApiResponse<Setlist>> => api.get(`/setlists/${id}`),
  
  // Create setlist
  create: (setlist: Omit<Setlist, 'id'>): Promise<ApiResponse<Setlist>> => 
    api.post('/setlists', setlist),
  
  // Update setlist
  update: (id: string, setlist: Partial<Setlist>): Promise<ApiResponse<Setlist>> => 
    api.put(`/setlists/${id}`, setlist),
  
  // Delete setlist
  delete: (id: string): Promise<ApiResponse<void>> => api.delete(`/setlists/${id}`),
};

// Transpose API
export const transposeApi = {
  // Transpose cifra
  transpose: (cifra: string, semitones: number): Promise<ApiResponse<{ originalCifra: string; transposedCifra: string; semitones: number }>> => 
    api.post('/transpose', { cifra, semitones }),
  
  // Get valid keys
  getValidKeys: (): Promise<ApiResponse<string[]>> => api.get('/transpose/keys'),
};

// Health check
export const healthApi = {
  check: (): Promise<ApiResponse<{ status: string; timestamp: string }>> => 
    api.get('/health'),
};

// Export default instance
export default api;
