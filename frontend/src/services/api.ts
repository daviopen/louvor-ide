import axios from 'axios';
import { apiConfig } from '../config/constants';
import { getCurrentUserToken } from './auth';

// Create simple axios instance
const api = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getCurrentUserToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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
  },

  // adiciona endpoint para obter música por ID
  getById: async (id: string) => {
    try {
      const response = await api.get(`/music/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching music:', error);
      throw error;
    }
  },

  // adiciona endpoint para atualização de música
  update: async (id: string, musicData: any) => {
    try {
      const response = await api.put(`/music/${id}`, musicData);
      return response.data;
    } catch (error) {
      console.error('Error updating music:', error);
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
  },

  // Nova função para buscar apenas ministros com flag "Ministro"
  getOnlyMinisters: async () => {
    try {
      const response = await api.get('/ministers');
      if (response.data?.success && response.data?.data) {
        // Filtrar apenas ministros que tenham "Ministro" nos instrumentos
        const onlyMinisters = response.data.data.filter((minister: any) => 
          minister.instrumento && 
          minister.instrumento.includes('Ministro') &&
          minister.status === 'ativo'
        );
        return {
          ...response.data,
          data: onlyMinisters
        };
      }
      return response.data;
    } catch (error) {
      console.error('Error fetching ministers:', error);
      throw error;
    }
  },

  create: async (ministerData: any) => {
    try {
      const response = await api.post('/ministers', ministerData);
      return response.data;
    } catch (error) {
      console.error('Error creating minister:', error);
      throw error;
    }
  },

  getById: async (id: string) => {
    try {
      const response = await api.get(`/ministers/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching minister:', error);
      throw error;
    }
  },

  update: async (id: string, ministerData: any) => {
    try {
      const response = await api.put(`/ministers/${id}`, ministerData);
      return response.data;
    } catch (error) {
      console.error('Error updating minister:', error);
      throw error;
    }
  },

  delete: async (id: string) => {
    try {
      const response = await api.delete(`/ministers/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting minister:', error);
      throw error;
    }
  },

  // Get unique instruments used by ministers
  getUniqueInstrumentos: async () => {
    try {
      const response = await api.get('/ministers/instruments');
      return response.data;
    } catch (error) {
      console.error('Error fetching unique instruments:', error);
      throw error;
    }
  }
};

export const usersApi = {
  getAll: async () => {
    try {
      const response = await api.get('/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  // Função para buscar apenas usuários com atuação "Ministro"
  getUsersWithMinisterRole: async () => {
    try {
      const response = await api.get('/users');
      if (response.data?.success && response.data?.data) {
        // Filtrar apenas usuários que tenham "Ministro" na atuação e estejam ativos
        const ministers = response.data.data.filter((user: any) => 
          user.atuacao && 
          user.atuacao.includes('Ministro') &&
          user.status === 'ativo'
        );
        return {
          ...response.data,
          data: ministers
        };
      }
      return response.data;
    } catch (error) {
      console.error('Error fetching users with minister role:', error);
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

export const transposeApi = {
  transposeCifra: async (data: { cifra: string; semitones: number; tom_original?: string }) => {
    try {
      const response = await api.post('/transpose', {
        cifra: data.cifra,
        semitones: data.semitones,
        tomOriginal: data.tom_original
      });
      return response.data;
    } catch (error) {
      console.error('Error transposing cifra:', error);
      throw error;
    }
  }
};

// Compatibility export for existing code
const ApiService = {
  transposeCifra: transposeApi.transposeCifra
};

export { ApiService };

// Export the axios instance for direct use
export { api };

export default api;
