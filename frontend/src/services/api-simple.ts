import axios from 'axios';
import { apiConfig } from '../config/constants';

// Create simple axios instance
const api = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Simple API functions
export const musicApi = {
  getAll: async () => {
    try {
      const response = await api.get('/music');
      return response.data;
    } catch (error) {
      console.error('Error fetching music:', error);
      throw error;
    }
  },

  create: async (musicData: any) => {
    try {
      const response = await api.post('/music', musicData);
      return response.data;
    } catch (error) {
      console.error('Error creating music:', error);
      throw error;
    }
  },

  delete: async (id: string) => {
    try {
      const response = await api.delete(`/music/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting music:', error);
      throw error;
    }
  }
};

export const ministersApi = {
  getAll: async () => {
    try {
      const response = await api.get('/ministers');
      return response.data;
    } catch (error) {
      console.error('Error fetching ministers:', error);
      throw error;
    }
  }
};

export const healthApi = {
  check: async () => {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      console.error('Error checking health:', error);
      throw error;
    }
  }
};

export default api;
