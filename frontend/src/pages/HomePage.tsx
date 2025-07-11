import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Filter, SortAsc, SortDesc } from 'lucide-react';
import MusicCard from '../components/music/MusicCard';
import MusicViewer from '../components/music/MusicViewer';
import { musicApi } from '../services/api';
import type { Music, FilterOptions } from '../types/music';
import clsx from 'clsx';

interface OutletContext {
  searchQuery: string;
}

const HomePage: React.FC = () => {
  const { searchQuery } = useOutletContext<OutletContext>();
  const navigate = useNavigate();
  const [musics, setMusics] = useState<Music[]>([]);
  const [filteredMusics, setFilteredMusics] = useState<Music[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<Music | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'titulo' | 'artista' | 'criadoEm'>('criadoEm');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    ministro: '',
    tom: '',
    artista: ''
  });
  const [uniqueMinistros, setUniqueMinistros] = useState<string[]>([]);
  const [uniqueArtistas, setUniqueArtistas] = useState<string[]>([]);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Update search from parent component
  useEffect(() => {
    setFilters(prev => ({ ...prev, search: searchQuery }));
  }, [searchQuery]);

  // Filter and sort music when dependencies change
  useEffect(() => {
    filterAndSortMusic();
  }, [musics, filters, sortBy, sortOrder]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await musicApi.getAll();
      
      // A nova API já retorna diretamente a estrutura { success, data }
      if (response && response.success && response.data) {
        const musicData = response.data;
        setMusics(musicData);
        
        // Extract unique ministros and artistas from music data
        const ministros = [...new Set(musicData.flatMap((music: any) => music.ministros || []))];
        const artistas = [...new Set(musicData.map((music: any) => music.artista).filter(Boolean))];
        
        setUniqueMinistros(ministros as string[]);
        setUniqueArtistas(artistas as string[]);
      } else {
        throw new Error('Resposta inválida da API');
      }
    } catch (err) {
      console.error('❌ Erro detalhado ao carregar dados:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(`Erro ao carregar músicas: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortMusic = () => {
    let filtered = [...musics];

    // Apply filters
    if (filters.search) {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter(music =>
        music.titulo.toLowerCase().includes(term) ||
        music.artista.toLowerCase().includes(term) ||
        music.ministros.some(m => m.toLowerCase().includes(term)) ||
        music.tom.toLowerCase().includes(term)
      );
    }

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
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];

      if (sortBy === 'criadoEm') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
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

  const handleDeleteMusic = async (music: Music) => {
    if (window.confirm(`Tem certeza que deseja excluir a música "${music.titulo}"?`)) {
      try {
        const response = await musicApi.delete(music.id);
        if (response.success) {
          await loadData(); // Reload data
        } else {
          throw new Error('Falha ao excluir música');
        }
      } catch (err) {
        console.error('Erro ao excluir música:', err);
        setError('Erro ao excluir música. Tente novamente.');
      }
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Carregando músicas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={loadData}
          className="btn-primary"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Biblioteca de Músicas</h1>
        <p className="text-gray-600">
          {filteredMusics.length} {filteredMusics.length === 1 ? 'música encontrada' : 'músicas encontradas'}
          {musics.length !== filteredMusics.length && ` de ${musics.length} total`}
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Sort controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 whitespace-nowrap">Ordenar por:</span>
          <div className="flex gap-1">
            <SortButton field="criadoEm">Data</SortButton>
            <SortButton field="titulo">Título</SortButton>
            <SortButton field="artista">Artista</SortButton>
          </div>
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={clsx(
            'flex items-center gap-2 px-3 py-1 rounded text-sm transition-colors',
            showFilters 
              ? 'bg-primary-100 text-primary-700' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          <Filter className="w-4 h-4" />
          Filtros
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ministro</label>
              <select
                value={filters.ministro}
                onChange={(e) => setFilters(prev => ({ ...prev, ministro: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Todos os ministros</option>
                {uniqueMinistros.map(ministro => (
                  <option key={ministro} value={ministro}>{ministro}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tom</label>
              <select
                value={filters.tom}
                onChange={(e) => setFilters(prev => ({ ...prev, tom: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Todos os tons</option>
                {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(tom => (
                  <option key={tom} value={tom}>{tom}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Artista</label>
              <select
                value={filters.artista}
                onChange={(e) => setFilters(prev => ({ ...prev, artista: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Todos os artistas</option>
                {uniqueArtistas.map(artista => (
                  <option key={artista} value={artista}>{artista}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Music grid */}
      {filteredMusics.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMusics.map((music) => (
            <MusicCard
              key={music.id}
              music={music}
              onView={setSelectedMusic}
              onEdit={(music) => navigate(`/edit/${music.id}`)}
              onDelete={handleDeleteMusic}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            {filters.search || filters.ministro || filters.tom || filters.artista
              ? 'Nenhuma música encontrada com os filtros aplicados.'
              : 'Nenhuma música encontrada.'
            }
          </div>
          {(filters.search || filters.ministro || filters.tom || filters.artista) && (
            <button
              onClick={() => setFilters({ search: '', ministro: '', tom: '', artista: '' })}
              className="btn-secondary"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Music Viewer Modal */}
      <MusicViewer
        music={selectedMusic}
        isOpen={!!selectedMusic}
        onClose={() => setSelectedMusic(null)}
        onEdit={(music) => navigate(`/edit/${music.id}`)}
      />
    </div>
  );
};

export default HomePage;
