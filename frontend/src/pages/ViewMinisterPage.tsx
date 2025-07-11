import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ministersApi } from '../services/api';
import type { Minister } from '../types/music';

const ViewMinisterPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [minister, setMinister] = useState<Minister | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    ministersApi.getById(id)
      .then(res => {
        if (res.success && res.data) {
          setMinister(res.data as Minister);
        } else {
          setError('Ministro não encontrado');
        }
      })
      .catch(() => setError('Erro ao carregar ministro'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <p className="p-8 text-center">Carregando...</p>;
  }

  if (error) {
    return <p className="p-8 text-center text-red-600">{error}</p>;
  }

  if (!minister) {
    return <p className="p-8 text-center">Ministro não encontrado</p>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button onClick={() => navigate('/ministers')} className="mb-4 text-blue-500 hover:underline">&larr; Voltar</button>
      <h1 className="text-3xl font-bold mb-4">{minister.nome}</h1>
      <div className="space-y-2 text-gray-700">
        <p><strong>Email:</strong> {minister.email || '-'}</p>
        <p><strong>Telefone:</strong> {minister.telefone || '-'}</p>
        <p><strong>Status:</strong> {minister.status}</p>
        <p><strong>Instrumentos:</strong> {minister.instrumento.join(', ')}</p>
        <p><strong>Criado em:</strong> {new Date(minister.createdAt).toLocaleString('pt-BR')}</p>
        <p><strong>Atualizado em:</strong> {new Date(minister.updatedAt!).toLocaleString('pt-BR')}</p>
      </div>
      <div className="mt-6 flex gap-2">
        <button onClick={() => navigate(`/ministers/edit/${minister.id}`)} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Editar</button>
        <button onClick={() => navigate(`/ministers/add`)} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">Novo</button>
      </div>
    </div>
  );
};

export default ViewMinisterPage;
