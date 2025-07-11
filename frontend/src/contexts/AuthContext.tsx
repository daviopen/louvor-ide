import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthUser, AuthContextType, LoginCredentials, RegisterCredentials } from '../types/auth';
import {
  signIn as authSignIn,
  signUp as authSignUp,
  signOut as authSignOut,
  updateProfile as authUpdateProfile,
  resetPassword as authResetPassword,
  sendVerificationEmail as authSendVerificationEmail,
  checkEmailVerification as authCheckEmailVerification,
  onAuthStateChange,
} from '../services/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (credentials: LoginCredentials): Promise<void> => {
    try {
      setLoading(true);
      const authUser = await authSignIn(credentials);
      setUser(authUser);
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (credentials: RegisterCredentials): Promise<void> => {
    try {
      setLoading(true);
      const authUser = await authSignUp(credentials);
      setUser(authUser);
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      setLoading(true);
      await authSignOut();
      setUser(null);
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: { name?: string; picture?: string }): Promise<void> => {
    try {
      await authUpdateProfile(data);
      
      // Atualizar estado local
      if (user) {
        setUser({
          ...user,
          name: data.name || user.name,
          picture: data.picture || user.picture,
        });
      }
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      await authResetPassword(email);
    } catch (error) {
      throw error;
    }
  };

  const sendVerificationEmail = async (): Promise<void> => {
    try {
      await authSendVerificationEmail();
    } catch (error) {
      throw error;
    }
  };

  const checkEmailVerification = async (): Promise<boolean> => {
    try {
      const isVerified = await authCheckEmailVerification();
      
      // Atualizar estado local se verificado
      if (isVerified && user && !user.emailVerified) {
        setUser({
          ...user,
          emailVerified: true,
        });
      }
      
      return isVerified;
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resetPassword,
    sendVerificationEmail,
    checkEmailVerification,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
