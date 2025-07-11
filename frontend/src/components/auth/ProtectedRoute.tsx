import React, { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminStatus } from '../../hooks/useAdminStatus';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  allowedRoles?: Array<'admin' | 'minister' | 'user'>;
  requireAdmin?: boolean; // Nova prop para verificação específica de admin
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  allowedRoles,
  requireAdmin = false,
  redirectTo = '/login'
}) => {
  const { user, loading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const location = useLocation();

  // Mostrar loading enquanto verifica autenticação e permissões
  if (loading || (requireAdmin && adminLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Verificar se precisa estar autenticado
  if (requireAuth && !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Verificação específica para admin usando o novo sistema
  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Acesso Negado
            </h2>
            <p className="mt-2 text-gray-600">
              Você não tem permissão para acessar esta página.
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Role necessária: admin
            </p>
            {user?.role && (
              <p className="mt-1 text-sm text-gray-500">
                Sua role: {typeof user.role === 'object' ? user.role.displayName : user.role}
              </p>
            )}
          </div>
          <div>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Verificar roles se especificadas (sistema legado)
  if (user && allowedRoles && allowedRoles.length > 0 && !requireAdmin) {
    const userRoleString = typeof user.role === 'object' ? user.role.displayName.toLowerCase() : (user.role || 'user');
    const hasValidRole = allowedRoles.some(role => role === userRoleString || 
      (typeof user.role === 'object' && user.role.permissions?.includes(`${role}.all`)));
    
    if (!hasValidRole) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full space-y-8 text-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Acesso Negado
              </h2>
              <p className="mt-2 text-gray-600">
                Você não tem permissão para acessar esta página.
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Role necessária: {allowedRoles.join(', ')}
              </p>
              {user?.role && (
                <p className="mt-1 text-sm text-gray-500">
                  Sua role: {typeof user.role === 'object' ? user.role.displayName : user.role}
                </p>
              )}
            </div>
            <div>
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
