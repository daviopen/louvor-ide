import React from 'react';
import { useAdminStatus } from '../../hooks/useAdminStatus';
import { useAuth } from '../../contexts/AuthContext';

const AdminStatusCard: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin, isMasterAdmin, role, loading, error } = useAdminStatus();

  if (!user) {
    return null;
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Status do Usuário
      </h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Email:</span>
          <span className="text-sm text-gray-900">{user.email}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Nome:</span>
          <span className="text-sm text-gray-900">{user.name}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Role:</span>
          <span className={`text-sm px-2 py-1 rounded-full text-xs font-medium ${
            role === 'admin' 
              ? 'bg-red-100 text-red-800'
              : role === 'minister'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {role}
          </span>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-600">Verificando permissões...</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">É Admin:</span>
              <span className={`text-sm font-medium ${
                isAdmin ? 'text-green-600' : 'text-gray-600'
              }`}>
                {isAdmin ? '✅ Sim' : '❌ Não'}
              </span>
            </div>
            
            {isAdmin && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Master Admin:</span>
                <span className={`text-sm font-medium ${
                  isMasterAdmin ? 'text-purple-600' : 'text-gray-600'
                }`}>
                  {isMasterAdmin ? '👑 Sim' : '❌ Não'}
                </span>
              </div>
            )}
            
            {error && (
              <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                ⚠️ {error}
              </div>
            )}
          </>
        )}
        
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm font-medium text-gray-600">Email Verificado:</span>
          <span className={`text-sm font-medium ${
            user.emailVerified ? 'text-green-600' : 'text-orange-600'
          }`}>
            {user.emailVerified ? '✅ Sim' : '⚠️ Não'}
          </span>
        </div>
      </div>
      
      {isAdmin && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>🔧 Funcionalidades de Admin:</strong>
          </p>
          <ul className="text-xs text-blue-700 mt-1 space-y-1">
            <li>• Gerenciar todos os usuários</li>
            <li>• Acessar relatórios administrativos</li>
            <li>• Configurar sistema</li>
            {isMasterAdmin && (
              <li className="text-purple-700">• <strong>Promover outros admins</strong></li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AdminStatusCard;
