import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AdminStatus {
  isAdmin: boolean;
  isMasterAdmin: boolean;
  role: string;
  loading: boolean;
  error: string | null;
}

export const useAdminStatus = (): AdminStatus => {
  const { user } = useAuth();
  const [status, setStatus] = useState<AdminStatus>({
    isAdmin: false,
    isMasterAdmin: false,
    role: 'user',
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!user) {
      setStatus({
        isAdmin: false,
        isMasterAdmin: false,
        role: 'user',
        loading: false,
        error: null
      });
      return;
    }

    // Usar dados locais do usuário quando disponíveis
    if (user.role) {
      const roleDisplay = typeof user.role === 'object' && user.role ? (user.role as any).displayName : (user.role || 'user');
      const isAdminCheck = typeof user.role === 'object' && user.role ? (user.role as any).permissions?.includes('admin.all') : user.role === 'admin';
      
      setStatus({
        isAdmin: isAdminCheck,
        isMasterAdmin: false,
        role: roleDisplay,
        loading: false,
        error: null
      });
      return;
    }

    // Fallback básico se não tiver role
    setStatus({
      isAdmin: false,
      isMasterAdmin: false,
      role: 'user',
      loading: false,
      error: null
    });
  }, [user?.uid, user?.role]);

  return status;
};
