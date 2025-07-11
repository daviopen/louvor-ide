import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, X, User as UserIcon, SortAsc, SortDesc, Plus, Music, Edit, Trash2, Eye, MessageCircle } from 'lucide-react';
import { useAdminStatus } from '../hooks/useAdminStatus';
import { api } from '../services/api';
import clsx from 'clsx';

interface User {
  id: string;
  uid: string;
  nome: string;
  email: string;
  telefone?: string;
  atuacao?: string[];
  status: 'ativo' | 'inativo' | 'pendente' | 'excluido';
  isMinister?: boolean;
  instrumento?: string[];
  role?: {
    id: string;
    displayName: string;
    permissions: string[];
  };
  createdAt: Date;
  lastLogin?: Date;
}

interface UserFilterOptions {
  search: string;
  status: string;
  atuacao: string;
  isMinister: string;
}



interface UserCardProps {
  user: User;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, onEdit, onDelete, onView }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-green-100 text-green-800';
      case 'inativo': return 'bg-red-100 text-red-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'excluido': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-6 border border-gray-200 cursor-pointer group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center flex-1 min-w-0" onClick={onView}>
          <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center">
            <UserIcon className="h-6 w-6 text-primary-600" />
          </div>
          <div className="ml-3 min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors">{user.nome}</h3>
            <p className="text-sm text-gray-600 truncate">{user.email}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 ml-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary-600 transition-colors"
            title="Editar usuário"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary-600 transition-colors"
            title="Ver detalhes"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors"
            title="Excluir usuário"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status badge */}
      <div className="mb-4">
        <span className={clsx('px-3 py-1 text-xs font-semibold rounded-full', getStatusColor(user.status))}>
          {user.status}
        </span>
      </div>

      <div className="space-y-3 mb-4">
        {user.telefone && (
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-5 h-5 flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-green-500" />
            </div>
            <span className="ml-2">{user.telefone}</span>
          </div>
        )}
        {user.atuacao && user.atuacao.length > 0 && (
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-5 h-5 flex items-center justify-center">
              <Music className="h-4 w-4 text-blue-500" />
            </div>
            <span className="ml-2">{user.atuacao.join(', ')}</span>
          </div>
        )}
        {user.isMinister && user.instrumento && user.instrumento.length > 0 && (
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-5 h-5 flex items-center justify-center">
              <Music className="h-4 w-4 text-purple-500" />
            </div>
            <span className="ml-2">{user.instrumento.join(', ')}</span>
          </div>
        )}
        {user.role && (
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-5 h-5 flex items-center justify-center">
              <UserIcon className="h-4 w-4 text-green-500" />
            </div>
            <span className="ml-2">{user.role.displayName}</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface UserViewerProps {
  user: User;
  onClose: () => void;
}

const UserViewer: React.FC<UserViewerProps> = ({ user, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Detalhes do Usuário</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informações Pessoais</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome</label>
                  <p className="mt-1 text-sm text-gray-900">{user.nome}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                </div>
                {user.telefone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Telefone</label>
                    <p className="mt-1 text-sm text-gray-900">{user.telefone}</p>
                  </div>
                )}
                {user.atuacao && user.atuacao.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Áreas de Atuação</label>
                    <p className="mt-1 text-sm text-gray-900">{user.atuacao.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Sistema</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={clsx('mt-1 inline-block px-2 py-1 text-xs font-medium rounded-full',
                    user.status === 'ativo' ? 'bg-green-100 text-green-800' :
                    user.status === 'inativo' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  )}>
                    {user.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo de Usuário</label>
                  <p className="mt-1 text-sm text-gray-900">{user.isMinister ? 'Ministro' : 'Usuário Comum'}</p>
                </div>
                {user.isMinister && user.instrumento && user.instrumento.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Instrumentos</label>
                    <p className="mt-1 text-sm text-gray-900">{user.instrumento.join(', ')}</p>
                  </div>
                )}
                {user.role && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Função</label>
                    <p className="mt-1 text-sm text-gray-900">{user.role.displayName}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Criado em</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                {user.lastLogin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Último login</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(user.lastLogin).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<UserFilterOptions>({
    search: '',
    status: '',
    atuacao: '',
    isMinister: ''
  });

  // Sorting states
  const [sortBy, setSortBy] = useState<'nome' | 'email' | 'createdAt'>('nome');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Available options
  const [uniqueAtuacoes, setUniqueAtuacoes] = useState<string[]>([]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Filter users when search or filters change
  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, filters, sortBy, sortOrder]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [usersData] = await Promise.all([
        api.get('/users').then(res => res.data.data)
      ]);

      // Filtrar usuários excluídos da listagem principal
      const activeUsers = usersData.filter((u: User) => u.status !== 'excluido');
      
      setUsers(activeUsers);

      // Use opções de atuação predefinidas
      setUniqueAtuacoes(['Violão', 'Guitarra', 'Violino', 'Bateria', 'Baixo', 'Teclado', 'Sax', 'Ministro', 'Diretor Musical']);
      
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setError(err.message || 'Erro ao carregar dados do sistema');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Apply search query
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      filtered = filtered.filter(user =>
        user.nome.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.telefone && user.telefone.toLowerCase().includes(query)) ||
        (user.atuacao && user.atuacao.some(a => a.toLowerCase().includes(query)))
      );
    }

    // Apply advanced filters
    if (filters.status) {
      filtered = filtered.filter(user => {
        const userStatus = String(user.status).toLowerCase().trim();
        const filterStatus = String(filters.status).toLowerCase().trim();
        return userStatus === filterStatus;
      });
    }

    if (filters.atuacao) {
      filtered = filtered.filter(user => user.atuacao && user.atuacao.includes(filters.atuacao));
    }

    if (filters.isMinister) {
      const isMinisterFilter = filters.isMinister === 'true';
      filtered = filtered.filter(user => Boolean(user.isMinister) === isMinisterFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let valueA: string | number = a[sortBy] as string;
      let valueB: string | number = b[sortBy] as string;

      if (sortBy === 'createdAt') {
        valueA = new Date(valueA).getTime();
        valueB = new Date(valueB).getTime();
      } else {
        valueA = String(valueA).toLowerCase();
        valueB = String(valueB).toLowerCase();
      }

      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredUsers(filtered);
  };

  const handleFilterChange = (key: keyof UserFilterOptions, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilters({
      search: '',
      status: '',
      atuacao: '',
      isMinister: ''
    });
  };

  const editUser = (userId: string) => {
    navigate(`/admin/edit-user/${userId}`);
  };

  const deleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário "${userName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await api.delete(`/users/${userId}`);
      
      // Atualizar estado local removendo o usuário excluído
      const updatedUsers = users.filter(user => user.id !== userId);
      setUsers(updatedUsers);
      
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir usuário');
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h1>
          <p className="text-gray-600 mb-4">Você não tem permissão para acessar esta página.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Administração de Usuários</h1>
          <p className="text-gray-600">Gerencie usuários, ministros e permissões do sistema</p>
        </div>
        <button
          onClick={() => navigate('/admin/create-user')}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Usuário
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6">
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome, email, telefone ou atuação..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={clsx(
                "inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
                showAdvancedFilters 
                  ? "bg-primary-50 text-primary-700 border-primary-300" 
                  : "bg-white text-gray-700 hover:bg-gray-50"
              )}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </button>
            {(searchQuery || Object.values(filters).some(v => v)) && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                <X className="h-4 w-4 mr-2" />
                Limpar
              </button>
            )}
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Todos</option>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="pendente">Pendente</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Atuação</label>
                <select
                  value={filters.atuacao}
                  onChange={(e) => handleFilterChange('atuacao', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Todas</option>
                  {uniqueAtuacoes.map(atuacao => (
                    <option key={atuacao} value={atuacao}>{atuacao}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Usuário</label>
                <select
                  value={filters.isMinister}
                  onChange={(e) => handleFilterChange('isMinister', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Todos</option>
                  <option value="true">Ministros</option>
                  <option value="false">Usuários Comuns</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ordenar por</label>
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'nome' | 'email' | 'createdAt')}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="nome">Nome</option>
                    <option value="email">Email</option>
                    <option value="createdAt">Data de Criação</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          Mostrando {filteredUsers.length} de {users.length} usuários
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Users Grid */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum usuário encontrado</h3>
          <p className="text-gray-600">Tente ajustar os filtros ou adicionar novos usuários.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onView={() => setSelectedUser(user)}
              onEdit={() => editUser(user.id)}
              onDelete={() => deleteUser(user.id, user.nome)}
            />
          ))}
        </div>
      )}

      {/* User Viewer Modal */}
      {selectedUser && (
        <UserViewer
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
};
