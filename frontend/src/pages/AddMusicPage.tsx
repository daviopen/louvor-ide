import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { musicApi, usersApi } from '../services/api';
import templateCifra from '../../../template_cifra.txt?raw';
import { X, Plus, Music, User } from 'lucide-react';

const AddMusicPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    titulo: '',
    artista: '',
    tom: 'C',
    cifra: templateCifra,
    observacoes: '',
    bpm: '',
    link: '',
    letra: '',
    ministros: [] as string[],
    tomMinistro: {} as Record<string, string>
  });

  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo || !formData.artista || !formData.cifra) {
      setError('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const musicData = {
        titulo: formData.titulo.trim(),
        artista: formData.artista.trim(),
        tom: formData.tom,
        cifra: formData.cifra.trim(),
        bpm: formData.bpm ? parseInt(formData.bpm) : undefined,
        link: formData.link.trim(),
        letra: formData.letra.trim(),
        observacoes: formData.observacoes.trim(),
        ministros: formData.ministros,
        tomMinistro: formData.tomMinistro,
        status: 'ativo' as const
      };

      const response = await musicApi.create(musicData);
      
      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        throw new Error('Falha ao criar música');
      }
    } catch (err) {
      console.error('Erro ao criar música:', err);
      setError('Erro ao criar música. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Lista de usuários com atuação "Ministro" disponíveis
  const [allMinisters, setAllMinisters] = useState<{id: string, nome: string}[]>([]);
  const [selectedMinister, setSelectedMinister] = useState('');
  const [selectedMinisterTom, setSelectedMinisterTom] = useState(formData.tom);

  useEffect(() => {
    // Busca apenas usuários que tenham "Ministro" na atuação
    usersApi.getUsersWithMinisterRole()
      .then((res: any) => setAllMinisters(res.data.map((user: any) => ({ id: user.id, nome: user.nome }))))
      .catch((err: any) => console.error('Erro ao buscar ministros:', err));
  }, []);

  const addSelectedMinister = () => {
    const minister = allMinisters.find(m => m.nome === selectedMinister);
    if (minister && !formData.ministros.includes(selectedMinister)) {
      setFormData(prev => ({
        ...prev,
        ministros: [...prev.ministros, selectedMinister],
        tomMinistro: { ...prev.tomMinistro, [selectedMinister]: selectedMinisterTom }
      }));
      setSelectedMinister('');
      setSelectedMinisterTom(formData.tom);
    }
  };

  const removeMinistro = (nome: string) => {
    setFormData(prev => ({
      ...prev,
      ministros: prev.ministros.filter(m => m !== nome),
      tomMinistro: Object.fromEntries(
        Object.entries(prev.tomMinistro).filter(([key]) => key !== nome)
      )
    }));
  };

  if (success) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          ✅ Música criada com sucesso! Redirecionando...
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Adicionar Nova Música</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Título *
          </label>
          <input
            type="text"
            value={formData.titulo}
            onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Artista *
          </label>
          <input
            type="text"
            value={formData.artista}
            onChange={(e) => setFormData(prev => ({ ...prev, artista: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tom
            </label>
            <select
              value={formData.tom}
              onChange={(e) => setFormData(prev => ({ ...prev, tom: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {keys.map(key => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              BPM
            </label>
            <input
              type="number"
              value={formData.bpm}
              onChange={(e) => setFormData(prev => ({ ...prev, bpm: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              max="300"
            />
          </div>
        </div>

        {/* Campo Link da Música */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Link da Música</label>
          <input
            type="url"
            value={formData.link}
            onChange={e => setFormData(prev => ({ ...prev, link: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cifra *
          </label>
          <textarea
            value={formData.cifra}
            onChange={(e) => setFormData(prev => ({ ...prev, cifra: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={8}
            placeholder="Digite a cifra da música..."
            required
          />
        </div>

        {/* Campo Letra da Música */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Letra da Música</label>
          <textarea
            value={formData.letra}
            onChange={e => setFormData(prev => ({ ...prev, letra: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={6}
            placeholder="Digite a letra da música..."
          />
        </div>

        {/* Campo Observações */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
          <textarea
            value={formData.observacoes}
            onChange={e => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            placeholder="Digite observações adicionais..."
          />
        </div>

        {/* Seleção de Ministros com interface aprimorada */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Music className="inline h-4 w-4 mr-2" />
            Ministros
          </label>
          
          {/* Formulário de adição */}
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Selecionar Ministro</label>
                <div className="relative">
                  <select
                    value={selectedMinister}
                    onChange={e => setSelectedMinister(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Selecione um ministro...</option>
                    {allMinisters
                      .filter(minister => !formData.ministros.includes(minister.nome))
                      .map(minister => (
                        <option key={minister.id} value={minister.nome}>
                          {minister.nome}
                        </option>
                      ))
                    }
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tom</label>
                <select
                  value={selectedMinisterTom}
                  onChange={e => setSelectedMinisterTom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {keys.map(key => (
                    <option key={key} value={key}>{key}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <button 
              type="button" 
              onClick={addSelectedMinister}
              disabled={!selectedMinister}
              className="mt-3 w-full md:w-auto inline-flex items-center justify-center px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Ministro
            </button>
          </div>

          {/* Lista de ministros adicionados */}
          {formData.ministros.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Ministros Adicionados ({formData.ministros.length})
              </h4>
              <div className="space-y-2">
                {formData.ministros.map(ministro => (
                  <div 
                    key={ministro} 
                    className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{ministro}</p>
                        <p className="text-xs text-gray-500">Tom: {formData.tomMinistro[ministro]}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMinistro(ministro)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      title="Remover ministro"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {formData.ministros.length === 0 && (
            <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
              <Music className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Nenhum ministro adicionado ainda</p>
              <p className="text-xs text-gray-400">Selecione ministros para associar com esta música</p>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Música'}
          </button>
          
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddMusicPage;
