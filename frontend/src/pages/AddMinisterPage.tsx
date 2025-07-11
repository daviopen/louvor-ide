import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ministersApi } from '../services/api';

type FormData = {
  nome: string;
  email: string;
  telefone: string;
  instrumento: string[];
  observacoes?: string;
};

const AddMinisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [instrumentsList, setInstrumentsList] = useState<string[]>([]);
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    email: '',
    telefone: '',
    instrumento: [],
    observacoes: ''
  });

  useEffect(() => {
    // Carrega o arquivo atuacao.txt via fetch
    fetch('/atuacao.txt')
      .then(response => response.text())
      .then(text => {
        const items = text.split(/\r?\n/).filter(Boolean);
        setInstrumentsList(items);
      })
      .catch(error => {
        console.error('Erro ao carregar atuacao.txt:', error);
        // Fallback para lista padrão se não conseguir carregar o arquivo
        setInstrumentsList(['Violão', 'Piano', 'Bateria', 'Baixo', 'Teclado']);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome) {
      setError('Nome é obrigatório');
      return;
    }
    if (formData.instrumento.length === 0) {
      setError('Pelo menos um instrumento deve ser selecionado');
      return;
    }
    
    try {
      setLoading(true);
      
      // Preparar dados apenas com os campos aceitos pelo backend
      const dataToSend: any = {
        nome: formData.nome,
        instrumento: formData.instrumento
      };
      
      // Adicionar campos opcionais apenas se não estiverem vazios
      if (formData.email && formData.email.trim()) {
        dataToSend.email = formData.email.trim();
      }
      if (formData.telefone && formData.telefone.trim()) {
        dataToSend.telefone = formData.telefone.trim();
      }
      if (formData.observacoes && formData.observacoes.trim()) {
        dataToSend.observacoes = formData.observacoes.trim();
      }
      
      await ministersApi.create(dataToSend);
      setSuccess(true);
      setTimeout(() => navigate('/ministers'), 1500);
    } catch (err) {
      console.error('Erro ao criar ministro:', err);
      setError('Erro ao criar ministro.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/ministers');
  };

  if (success) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          ✅ Ministro criado com sucesso! Redirecionando...
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Adicionar Novo Ministro</h1>
        <p className="text-gray-600">Preencha as informações do novo ministro</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nome */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome *
          </label>
          <input
            type="text"
            value={formData.nome}
            onChange={e => setFormData(prev => ({ ...prev, nome: e.target.value }))}
            className="input-field"
            required
            placeholder="Nome completo do ministro"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="input-field"
            placeholder="email@exemplo.com"
          />
        </div>

        {/* Telefone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefone
          </label>
          <input
            type="text"
            value={formData.telefone}
            onChange={e => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
            className="input-field"
            placeholder="(11) 99999-9999"
          />
        </div>

        {/* Atuação/Instrumentos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Atuação *
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {instrumentsList.map(inst => (
              <label key={inst} className="inline-flex items-center">
                <input
                  type="checkbox"
                  value={inst}
                  checked={formData.instrumento.includes(inst)}
                  onChange={e => {
                    if (e.target.checked) {
                      setFormData(prev => ({
                        ...prev,
                        instrumento: [...prev.instrumento, inst]
                      }));
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        instrumento: prev.instrumento.filter(i => i !== inst)
                      }));
                    }
                  }}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700">{inst}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observações
          </label>
          <textarea
            value={formData.observacoes || ''}
            onChange={e => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
            className="input-field"
            rows={3}
            placeholder="Observações sobre o ministro..."
          />
        </div>

        {/* Botões */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6">
          <button
            type="button"
            onClick={handleCancel}
            className="btn-secondary order-2 sm:order-1"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-primary order-1 sm:order-2"
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Salvar Ministro'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddMinisterPage;
