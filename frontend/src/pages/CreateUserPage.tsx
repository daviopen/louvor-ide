import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, ArrowLeft, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { ALL_ATUACAO_OPTIONS } from '../config/atuacao';
import { api } from '../services/api';
import clsx from 'clsx';

const CreateUserPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    telefone: '',
    atuacao: [] as string[],
    role: 'membro' as 'admin' | 'lider' | 'ministro' | 'membro', // Campo de role
    password: '' // Opcional - se vazio, usará "123456"
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAtuacaoChange = (atuacao: string) => {
    setFormData(prev => ({
      ...prev,
      atuacao: prev.atuacao.includes(atuacao) 
        ? prev.atuacao.filter(item => item !== atuacao)
        : [...prev.atuacao, atuacao]
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.displayName.trim()) {
      return 'Nome é obrigatório';
    }
    
    if (!formData.email.trim()) {
      return 'Email é obrigatório';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return 'Email deve ter um formato válido';
    }

    if (formData.password && formData.password.length < 6) {
      return 'A senha deve ter pelo menos 6 caracteres';
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      
      const userData = {
        uid: `temp-${Date.now()}`, // UID temporário - será ajustado pelo backend
        nome: formData.displayName.trim(),
        email: formData.email.trim(),
        telefone: formData.telefone.trim(),
        atuacao: formData.atuacao,
        role: formData.role, // Usar o role selecionado
        ...(formData.password && { password: formData.password })
      };

      const response = await api.post('/users', userData);
      
      if (response.data.success) {
        setSuccess(true);
        
        // Redirecionar após sucesso
        setTimeout(() => {
          navigate('/admin');
        }, 2000);
      } else {
        setError(response.data.error || 'Erro ao criar usuário');
      }
    } catch (err: any) {
      console.error('Erro ao criar usuário:', err);
      setError(err.response?.data?.error || err.message || 'Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Administração
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Criar Novo Usuário</h1>
          <p className="mt-2 text-gray-600">
            Adicione um novo usuário ao sistema. A senha padrão será "123456" se não especificada.
          </p>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <p className="text-sm text-green-800">
                  Usuário criado com sucesso! Redirecionando...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            {/* Nome */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                Nome completo *
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Nome completo do usuário"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email *
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>

            {/* Telefone */}
            <div>
              <label htmlFor="telefone" className="block text-sm font-medium text-gray-700">
                Telefone (opcional)
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="telefone"
                  name="telefone"
                  type="tel"
                  value={formData.telefone}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            {/* Função no Sistema */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Função no Sistema *
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="membro">Membro</option>
                <option value="ministro">Ministro</option>
                <option value="lider">Líder</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            {/* Senha (opcional) */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Senha (opcional)
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Deixe vazio para usar senha padrão (123456)"
              />
              <p className="mt-1 text-sm text-gray-500">
                Se não especificada, a senha padrão "123456" será usada.
              </p>
            </div>

            {/* Áreas de Atuação */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Áreas de Atuação (opcional - pode selecionar múltiplas)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_ATUACAO_OPTIONS.map(atuacao => (
                  <label key={atuacao} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.atuacao.includes(atuacao)}
                      onChange={() => handleAtuacaoChange(atuacao)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{atuacao}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </button>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={clsx(
                    'inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white',
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                  )}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Criando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Criar Usuário
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateUserPage;
