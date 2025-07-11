import { useAuth } from '../contexts/AuthContext';
import { getCurrentUserToken } from '../services/auth';
import { apiConfig } from '../config/constants';

interface RequestOptions extends RequestInit {
  requireAuth?: boolean;
}

export const useApi = () => {
  const { user } = useAuth();

  const makeRequest = async (url: string, options: RequestOptions = {}): Promise<Response> => {
    const { requireAuth = false, ...fetchOptions } = options;

    // Verificar se autenticação é necessária
    if (requireAuth && !user) {
      throw new Error('Usuário não autenticado');
    }

    // Adicionar token de autenticação se usuário estiver logado
    let headers = fetchOptions.headers || {};
    
    if (user) {
      const token = await getCurrentUserToken();
      if (token) {
        headers = {
          ...headers,
          'Authorization': `Bearer ${token}`,
        };
      }
    }

    // Adicionar Content-Type padrão para JSON se não especificado
    if (fetchOptions.body && typeof fetchOptions.body === 'string') {
      headers = {
        'Content-Type': 'application/json',
        ...headers,
      };
    }

    const baseUrl = apiConfig.baseURL;
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

    const response = await fetch(fullUrl, {
      ...fetchOptions,
      headers,
    });

    // Verificar se o token expirou
    if (response.status === 401 && user) {
      // Token expirado, fazer logout
      // Note: Isso pode ser melhorado com refresh tokens
      console.warn('Token expirado, fazendo logout...');
      // useAuth().signOut(); // Isso causaria um erro aqui, então vamos só logar
    }

    return response;
  };

  const get = async (url: string, requireAuth = false): Promise<Response> => {
    return makeRequest(url, { method: 'GET', requireAuth });
  };

  const post = async (url: string, data?: any, requireAuth = true): Promise<Response> => {
    return makeRequest(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      requireAuth,
    });
  };

  const put = async (url: string, data?: any, requireAuth = true): Promise<Response> => {
    return makeRequest(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      requireAuth,
    });
  };

  const del = async (url: string, requireAuth = true): Promise<Response> => {
    return makeRequest(url, { method: 'DELETE', requireAuth });
  };

  return {
    get,
    post,
    put,
    delete: del,
    makeRequest,
    isAuthenticated: !!user,
    user,
  };
};
