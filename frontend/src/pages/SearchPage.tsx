import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Music as MusicIcon, SortAsc, SortDesc, Plus } from 'lucide-react';
import MusicCard from '../components/music/MusicCard';
import MusicViewer from '../components/music/MusicViewer';
import { musicApi, usersApi } from '../services/api';
import type { Music, FilterOptions } from '../types/music';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';

const SearchPage: React.FC = () => {
  const [musics, setMusics] = useState<Music[]>([]);
  const [filteredMusics, setFilteredMusics] = useState<Music[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<Music | null>(null);
  const [ministers, setMinisters] = useState<{id: string, nome: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    ministro: '',
    tom: '',
    artista: ''
  });
  
  // Sorting states
  const [sortBy, setSortBy] = useState<'titulo' | 'artista' | 'updatedAt'>('titulo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const navigate = useNavigate();
  
  // Available options
  const [uniqueArtistas, setUniqueArtistas] = useState<string[]>([]);
  const [uniqueTons, setUniqueTons] = useState<string[]>([]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Filter music when search or filters change
  useEffect(() => {
    filterMusic();
  }, [musics, searchQuery, filters, sortBy, sortOrder]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load music and users with minister role (apenas usuários com atuação "Ministro" para filtros)
      const [musicResponse, usersResponse] = await Promise.all([
        musicApi.getAll(),
        usersApi.getUsersWithMinisterRole() // Busca apenas usuários com atuação "Ministro"
      ]);

      if (musicResponse?.success && musicResponse.data) {
        const musicData = musicResponse.data;
        setMusics(musicData);
        
        // Extract unique values for filters
        const artistas = [...new Set(musicData.map((music: Music) => music.artista).filter(Boolean))];
        const tons = [...new Set(musicData.map((music: Music) => music.tom).filter(Boolean))];
        
        setUniqueArtistas(artistas as string[]);
        setUniqueTons(tons as string[]);
      }

      if (usersResponse?.data) {
        setMinisters(usersResponse.data.map((user: any) => ({ id: user.id, nome: user.nome })));
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const filterMusic = () => {
    let filtered = [...musics];
    const query = searchQuery.toLowerCase();

    // Apply search query
    if (query) {
      filtered = filtered.filter(music =>
        music.titulo.toLowerCase().includes(query) ||
        music.artista.toLowerCase().includes(query) ||
        music.ministros.some(m => m.toLowerCase().includes(query)) ||
        music.tom.toLowerCase().includes(query) ||
        music.cifra.toLowerCase().includes(query) ||
        music.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply advanced filters
    if (filters.ministro) {
      filtered = filtered.filter(music =>
        music.ministros.includes(filters.ministro)
      );
    }

    if (filters.tom) {
      filtered = filtered.filter(music => music.tom === filters.tom);
    }

    if (filters.artista) {
      filtered = filtered.filter(music => music.artista === filters.artista);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortBy === 'updatedAt') {
        // Try multiple date fields as fallback
        const getDateValue = (item: any) => {
          const dateField = item.updatedAt || item.createdAt || item.criadoEm;
          if (!dateField) return 0;
          
          // Handle Firestore Timestamp objects
          if (dateField && typeof dateField === 'object' && dateField._seconds) {
            return dateField._seconds * 1000; // Convert seconds to milliseconds
          }
          
          // Handle regular date strings
          const date = new Date(dateField);
          return isNaN(date.getTime()) ? 0 : date.getTime();
        };
        
        aValue = getDateValue(a);
        bValue = getDateValue(b);
      } else {
        aValue = (a[sortBy] || '').toString().toLowerCase();
        bValue = (b[sortBy] || '').toString().toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredMusics(filtered);
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
      ministro: '',
      tom: '',
      artista: ''
    });
  };

  const hasActiveFilters = searchQuery || filters.ministro || filters.tom || filters.artista;

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

  if (selectedMusic) {
    return (
      <MusicViewer
        music={selectedMusic}
        onClose={() => setSelectedMusic(null)}
        onEdit={(music) => navigate(`/edit/${music.id}`)}
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Músicas</h1>
            <p className="text-gray-600">
              Gerencie suas músicas: busque, adicione, edite e organize
            </p>
          </div>
          <button
            onClick={() => navigate('/add')}
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Adicionar Nova Música
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Digite para buscar músicas..."
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
            <SortButton field="titulo">Título</SortButton>
            <SortButton field="artista">Artista</SortButton>
            <SortButton field="updatedAt">Data</SortButton>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Minister Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ministro
              </label>
              <select
                value={filters.ministro}
                onChange={(e) => setFilters(prev => ({ ...prev, ministro: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Todos os ministros</option>
                {ministers.map((minister) => (
                  <option key={minister.id} value={minister.nome}>
                    {minister.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Tom Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tom
              </label>
              <select
                value={filters.tom}
                onChange={(e) => setFilters(prev => ({ ...prev, tom: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Todos os tons</option>
                {uniqueTons.map((tom: string) => (
                  <option key={tom} value={tom}>
                    {tom}
                  </option>
                ))}
              </select>
            </div>

            {/* Artist Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Artista
              </label>
              <select
                value={filters.artista}
                onChange={(e) => setFilters(prev => ({ ...prev, artista: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Todos os artistas</option>
                {uniqueArtistas.map((artista) => (
                  <option key={artista} value={artista}>
                    {artista}
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
                {filteredMusics.length} {filteredMusics.length === 1 ? 'música encontrada' : 'músicas encontradas'}
                {hasActiveFilters && musics.length !== filteredMusics.length && (
                  <span className="text-gray-500"> de {musics.length} total</span>
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
          <span className="ml-3 text-gray-600">Carregando músicas...</span>
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
      {!loading && !error && filteredMusics.length === 0 && (
        <div className="text-center py-12">
          <MusicIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {hasActiveFilters ? 'Nenhuma música encontrada' : 'Nenhuma música disponível'}
          </h3>
          <p className="text-gray-600 mb-4">
            {hasActiveFilters 
              ? 'Tente ajustar os filtros de busca'
              : 'Adicione algumas músicas para começar'
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

      {/* Music Grid */}
      {!loading && !error && filteredMusics.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMusics.map((music) => (
            <MusicCard
              key={music.id}
              music={music}
              onView={(music) => setSelectedMusic(music)}
              onEdit={(music) => navigate(`/edit/${music.id}`)}
              onDelete={async (music) => {
                if (window.confirm(`Tem certeza que deseja excluir a música "${music.titulo}"?`)) {
                  try {
                    const response = await musicApi.delete(music.id);
                    if (response.success) {
                      await loadInitialData();
                    }
                  } catch (err) {
                    console.error('Erro ao excluir música:', err);
                  }
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
