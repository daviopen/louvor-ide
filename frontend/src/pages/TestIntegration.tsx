import React, { useState, useEffect } from 'react';
import { musicApi, healthApi } from '../services/api';

const TestIntegration: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [musicData, setMusicData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const testHealth = async () => {
    try {
      setLoading(true);
      const response = await healthApi.check();
      setHealthStatus(response);
      setError(null);
    } catch (err) {
      console.error('Health check failed:', err);
      setError('Falha no health check');
    } finally {
      setLoading(false);
    }
  };

  const testMusic = async () => {
    try {
      setLoading(true);
      const response = await musicApi.getAll();
      setMusicData(response);
      setError(null);
    } catch (err) {
      console.error('Music API failed:', err);
      setError('Falha na API de músicas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testHealth();
    testMusic();
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Teste de Integração Backend/Frontend</h1>
      
      {loading && <div className="text-blue-600">Carregando...</div>}
      {error && <div className="text-red-600 mb-4">Erro: {error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Health Check</h2>
          <button 
            onClick={testHealth}
            className="bg-blue-500 text-white px-4 py-2 rounded mb-4 hover:bg-blue-600"
          >
            Testar Health
          </button>
          {healthStatus && (
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(healthStatus, null, 2)}
            </pre>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">API de Músicas</h2>
          <button 
            onClick={testMusic}
            className="bg-green-500 text-white px-4 py-2 rounded mb-4 hover:bg-green-600"
          >
            Testar Músicas
          </button>
          {musicData && (
            <div>
              <p className="mb-2">Total de músicas: {musicData.data?.length || 0}</p>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
                {JSON.stringify(musicData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestIntegration;
