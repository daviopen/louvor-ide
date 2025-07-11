import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, X, User } from 'lucide-react';
import { api } from '../services/api';
import { ALL_ATUACAO_OPTIONS } from '../config/atuacao';

interface UserData {
  id: string;
  uid: string;
  nome: string;
  email: string;
  telefone?: string;
  atuacao?: string[];
  status: 'ativo' | 'inativo' | 'pendente';
  instrumento?: string[];
  role?: {
    id: string;
    displayName: string;
    permissions: string[];
  };
}

export const EditUserPage: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    atuacao: [] as string[],
    status: 'ativo' as 'ativo' | 'inativo' | 'pendente',
    role: 'membro' as 'admin' | 'lider' | 'ministro' | 'membro',
    newPassword: '', // Novo campo para redefinir senha
  });

  useEffect(() => {
    if (userId) {
      loadUser();
    }
  }, [userId]);

  const loadUser = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/users/${userId}`);
      const userData = response.data.data;
      
      setUser(userData);
      setFormData({
        nome: userData.nome || '',
        email: userData.email || '',
        telefone: userData.telefone || '',
        atuacao: userData.atuacao || [],
        status: userData.status || 'ativo',
        role: userData.role?.displayName === 'Admin' ? 'admin' : 
              userData.role?.displayName === 'Líder' ? 'lider' :
              userData.role?.displayName === 'Ministro' ? 'ministro' : 'membro',
        newPassword: '',
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);

      // Validar senha se foi fornecida
      if (formData.newPassword.trim() && formData.newPassword.trim().length < 6) {
        setError('A nova senha deve ter pelo menos 6 caracteres');
        return;
      }

      const updateData: any = {
        nome: formData.nome.trim(),
        email: formData.email.trim(),
        telefone: formData.telefone.trim() || undefined,
        atuacao: formData.atuacao.length > 0 ? formData.atuacao : undefined,
        status: formData.status,
        role: formData.role,
      };

      // Incluir senha apenas se foi fornecida
      if (formData.newPassword.trim()) {
        updateData.password = formData.newPassword.trim();
      }

      await api.put(`/users/${userId}`, updateData);
      navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao atualizar usuário');
    } finally {
      setSaving(false);
    }
  };

  const handleAtuacaoChange = (atuacao: string): void => {
    setFormData(prev => ({
      ...prev,
      atuacao: prev.atuacao.includes(atuacao)
        ? prev.atuacao.filter(a => a !== atuacao)
        : [...prev.atuacao, atuacao]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Usuário não encontrado</h1>
          <button
            onClick={() => navigate('/admin')}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Voltar à Administração
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/admin')}
            className="mr-4 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Editar Usuário</h1>
            <p className="text-gray-600">Atualize as informações do usuário</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-6">
            <User className="h-6 w-6 text-primary-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Informações Pessoais</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo *
              </label>
              <input
                type="text"
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            <div>
              <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-2">
                Telefone
              </label>
              <input
                type="tel"
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'ativo' | 'inativo' | 'pendente' }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="pendente">Pendente</option>
              </select>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Função no Sistema *
              </label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'admin' | 'lider' | 'ministro' | 'membro' }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="membro">Membro</option>
                <option value="ministro">Ministro</option>
                <option value="lider">Líder</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Nova Senha (opcional)
              </label>
              <input
                type="password"
                id="newPassword"
                value={formData.newPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                autoComplete="new-password"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Deixe vazio para manter a senha atual"
              />
              <p className="mt-1 text-sm text-gray-500">
                Se preenchido, será definida uma nova senha para o usuário.
              </p>
            </div>
          </div>
        </div>

        {/* Áreas de Atuação */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Áreas de Atuação</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {ALL_ATUACAO_OPTIONS.map((atuacao) => (
              <label key={atuacao} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.atuacao.includes(atuacao)}
                  onChange={() => handleAtuacaoChange(atuacao)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700">{atuacao}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6">
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </button>
          
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <X className="h-4 w-4 mr-2 inline" />
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </div>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2 inline" />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
