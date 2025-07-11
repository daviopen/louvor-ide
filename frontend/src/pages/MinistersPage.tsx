import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, X, User as UserIcon, SortAsc, SortDesc, Plus } from 'lucide-react';
import MinisterCard from '../components/music/MinisterCard';
import MinisterViewer from '../components/music/MinisterViewer';
import { ministersApi } from '../services/api';
import type { Minister } from '../types/music';
import clsx from 'clsx';

interface MinisterFilterOptions {
  search: string;
  status: string;
  instrumento: string;
}

const MinistersPage: React.FC = () => {
  const navigate = useNavigate();
  const [ministers, setMinisters] = useState<Minister[]>([]);
  const [filteredMinisters, setFilteredMinisters] = useState<Minister[]>([]);
  const [selectedMinister, setSelectedMinister] = useState<Minister | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<MinisterFilterOptions>({
    search: '',
    status: '',
    instrumento: ''
  });

  // Sorting states
  const [sortBy, setSortBy] = useState<'nome' | 'email' | 'createdAt'>('nome');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Available options
  const [uniqueInstruments, setUniqueInstruments] = useState<string[]>([]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Filter ministers when search or filters change
  useEffect(() => {
    filterMinisters();
  }, [ministers, searchQuery, filters, sortBy, sortOrder]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await ministersApi.getAll();
      
      if (response?.success && response.data) {
        const ministerData = response.data;
        setMinisters(ministerData);
        
        // Extract unique instruments for filters
        const instruments = [...new Set(
          ministerData.flatMap((minister: Minister) => minister.instrumento || [])
        )].filter(Boolean);
        
        setUniqueInstruments(instruments as string[]);
      }
    } catch (err) {
      console.error('Erro ao carregar ministros:', err);
      setError('Erro ao carregar ministros. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const filterMinisters = () => {
    let filtered = [...ministers];
    const query = searchQuery.toLowerCase();

    // Apply search query
    if (query) {
      filtered = filtered.filter(minister =>
        minister.nome.toLowerCase().includes(query) ||
        minister.email?.toLowerCase().includes(query) ||
        minister.telefone?.toLowerCase().includes(query) ||
        minister.instrumento.some(inst => inst.toLowerCase().includes(query)) ||
        minister.observacoes?.toLowerCase().includes(query)
      );
    }

    // Apply advanced filters
    if (filters.status) {
      filtered = filtered.filter(minister => minister.status === filters.status);
    }

    if (filters.instrumento) {
      filtered = filtered.filter(minister =>
        minister.instrumento.includes(filters.instrumento)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];

      if (sortBy === 'createdAt') {
        aValue = new Date(aValue || a.createdAt).getTime();
        bValue = new Date(bValue || b.createdAt).getTime();
      } else {
        aValue = aValue?.toString().toLowerCase() || '';
        bValue = bValue?.toString().toLowerCase() || '';
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredMinisters(filtered);
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilters({
      search: '',
      status: '',
      instrumento: ''
    });
  };

  const hasActiveFilters = searchQuery || filters.status || filters.instrumento;

  const SortButton: React.FC<{ field: typeof sortBy; children: React.ReactNode }> = ({ field, children }) => (
    <button
      onClick={() => handleSort(field)}
      className={clsx(
        'flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors',
        sortBy === field 
          ? 'bg-primary-100 text-primary-700' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      )}
    >
      {children}
      {sortBy === field && (
        sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
      )}
    </button>
  );

  if (selectedMinister) {
    return (
      <MinisterViewer
        minister={selectedMinister}
        onClose={() => setSelectedMinister(null)}
        onEdit={(minister) => navigate(`edit/${minister.id}`)}
        isOpen={true}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Ministros</h1>
            <p className="text-gray-600">
              Gerencie seus ministros: busque, adicione, edite e organize
            </p>
          </div>
          <button
            onClick={() => navigate('add')}
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Adicionar Novo Ministro
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Digite para buscar ministros..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
              showAdvancedFilters
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            <Filter className="w-4 h-4" />
            Filtros Avançados
          </button>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Limpar Filtros
            </button>
          )}

          {/* Sort Options */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Ordenar por:</span>
            <SortButton field="nome">Nome</SortButton>
            <SortButton field="email">Email</SortButton>
            <SortButton field="createdAt">Data</SortButton>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Todos os status</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>

            {/* Instrument Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instrumento
              </label>
              <select
                value={filters.instrumento}
                onChange={(e) => setFilters(prev => ({ ...prev, instrumento: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Todos os instrumentos</option>
                {uniqueInstruments.map((instrument) => (
                  <option key={instrument} value={instrument}>
                    {instrument}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <p className="text-gray-600">
            {loading ? (
              'Carregando...'
            ) : (
              <>
                {filteredMinisters.length} {filteredMinisters.length === 1 ? 'ministro encontrado' : 'ministros encontrados'}
                {hasActiveFilters && ministers.length !== filteredMinisters.length && (
                  <span className="text-gray-500"> de {ministers.length} total</span>
                )}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Carregando ministros...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">{error}</div>
          <button
            onClick={loadInitialData}
            className="btn-primary"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredMinisters.length === 0 && (
        <div className="text-center py-12">
          <UserIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {hasActiveFilters ? 'Nenhum ministro encontrado' : 'Nenhum ministro disponível'}
          </h3>
          <p className="text-gray-600 mb-4">
            {hasActiveFilters 
              ? 'Tente ajustar os filtros de busca'
              : 'Adicione alguns ministros para começar'
            }
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="btn-primary"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      )}

      {/* Ministers Grid */}
      {!loading && !error && filteredMinisters.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMinisters.map((minister) => (
            <MinisterCard
              key={minister.id}
              minister={minister}
              onView={(minister) => setSelectedMinister(minister)}
              onEdit={(minister) => navigate(`edit/${minister.id}`)}
              onDelete={async (minister) => {
                if (window.confirm(`Tem certeza que deseja excluir o ministro "${minister.nome}"?`)) {
                  try {
                    const response = await ministersApi.delete(minister.id);
                    if (response.success) {
                      await loadInitialData();
                    }
                  } catch (err) {
                    console.error('Erro ao excluir ministro:', err);
                  }
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Statistics */}
      {!loading && !error && ministers.length > 0 && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Estatísticas</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Total:</span> {ministers.length}
            </div>
            <div>
              <span className="font-medium">Ativos:</span> {ministers.filter(m => m.status === 'ativo').length}
            </div>
            <div>
              <span className="font-medium">Inativos:</span> {ministers.filter(m => m.status === 'inativo').length}
            </div>
            <div>
              <span className="font-medium">Instrumentos:</span> {uniqueInstruments.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MinistersPage;
