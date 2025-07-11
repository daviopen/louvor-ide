import React, { useState, useRef, useEffect } from 'react';
import { LogOut, User, Settings, Shield, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

const UserMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center">
        <button
          onClick={() => navigate('/login')}
          className="bg-primary-600 text-white hover:bg-primary-700 px-4 py-2 rounded-md text-sm font-medium"
        >
          Entrar
        </button>
      </div>
    );
  }

  type RoleType = string | { id: string; displayName: string; permissions: string[] } | undefined;

  const getRoleValue = (role: RoleType): string | undefined => {
    if (!role) return undefined;
    if (typeof role === 'string') return role;
    if ('id' in role) return role.id;
    return undefined;
  };

  const getRoleColor = (role?: RoleType) => {
    const value = getRoleValue(role);
    switch (value) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'minister':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  } 

  const getRoleLabel = (role?: RoleType) => {
    const value = getRoleValue(role);
    switch (value) {
      case 'admin':
        return 'Administrador';
      case 'minister':
        return 'Ministro';
      default:
        return 'Usuário';
    }
  } 

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-md p-2"
      >
        <div className="flex items-center space-x-2">
          {user.picture ? (
            <img
              src={user.picture}
              alt={user.name || user.email}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
          )}
          <span className="hidden md:block text-sm font-medium">
            {user.name || user.email.split('@')[0]}
          </span>
        </div>
        <ChevronDown className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name || user.email}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary-600 flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.name || 'Usuário'}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {user.email}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={clsx(
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                    getRoleColor(user.role)
                  )}>
                    <Shield className="h-3 w-3 mr-1" />
                    {getRoleLabel(user.role)}
                  </span>
                  {user.emailVerified && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Verificado
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/profile');
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <User className="h-4 w-4 mr-3" />
              Meu Perfil
            </button>

            {user.role === 'admin' && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/admin');
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Settings className="h-4 w-4 mr-3" />
                Administração
              </button>
            )}

            <button
              onClick={() => {
                setIsOpen(false);
                handleSignOut();
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4 mr-3" />
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
