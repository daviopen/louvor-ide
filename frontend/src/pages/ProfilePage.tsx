import React, { useState } from 'react';
import { User, Mail, Shield, Camera, Save, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../services/firebase';
import AdminStatusCard from '../components/auth/AdminStatusCard';
import clsx from 'clsx';

const ProfilePage: React.FC = () => {
  const { user, updateProfile, sendVerificationEmail, checkEmailVerification } = useAuth();
  const [loading, setLoading] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Estados do formulário de perfil
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    picture: user?.picture || ''
  });

  // Estados do formulário de senha
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  type RoleType = string | { id: string; displayName: string; permissions: string[] } | undefined;

  const getRoleValue = (role: RoleType): string | undefined => {
    if (!role) return undefined;
    if (typeof role === 'string') return role;
    if ('id' in role) return role.id;
    return undefined;
  };

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
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    try {
      setLoading(true);
      await updateProfile(profileData);
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao atualizar perfil' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'As novas senhas não coincidem' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres' });
      return;
    }

    try {
      setLoading(true);
      
      if (!auth.currentUser || !user?.email) {
        throw new Error('Usuário não autenticado');
      }

      // Reautenticar usuário
      const credential = EmailAuthProvider.credential(user.email, passwordData.currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Atualizar senha
      await updatePassword(auth.currentUser, passwordData.newPassword);
      
      setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      let errorMessage = 'Erro ao alterar senha';
      
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Senha atual incorreta';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'A nova senha é muito fraca';
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    setMessage(null);
    try {
      setVerificationLoading(true);
      await sendVerificationEmail();
      setMessage({ 
        type: 'success', 
        text: 'Email de verificação enviado! Verifique sua caixa de entrada e spam.' 
      });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao enviar email de verificação' });
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setMessage(null);
    try {
      setVerificationLoading(true);
      const isVerified = await checkEmailVerification();
      if (isVerified) {
        setMessage({ type: 'success', text: 'Email verificado com sucesso!' });
      } else {
        setMessage({ type: 'error', text: 'Email ainda não foi verificado' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao verificar status' });
    } finally {
      setVerificationLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
        <p className="text-gray-600 mt-2">Gerencie suas informações pessoais e configurações</p>
      </div>

      {/* Mensagem de feedback */}
      {message && (
        <div className={clsx(
          'mb-6 p-4 rounded-md flex items-center',
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        )}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 mr-2" />
          ) : (
            <AlertCircle className="h-5 w-5 mr-2" />
          )}
          {message.text}
        </div>
      )}

      {/* Status de Admin */}
      <AdminStatusCard />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações do Usuário */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name || user.email}
                  className="w-24 h-24 rounded-full mx-auto object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary-600 flex items-center justify-center mx-auto">
                  <User className="h-12 w-12 text-white" />
                </div>
              )}
              
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                {user.name || 'Usuário'}
              </h2>
              
              <p className="text-gray-600 break-all">{user.email}</p>
              
              <div className="mt-3 flex items-center justify-center">
                <span className={clsx(
                  'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
                  getRoleColor(user.role)
                )}>
                  <Shield className="h-3 w-3 mr-1" />
                  {getRoleLabel(user.role)}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-1" />
                  {user.emailVerified ? (
                    <span className="text-green-600">Verificado</span>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-red-600">Não verificado</span>
                      <button
                        onClick={handleSendVerificationEmail}
                        disabled={verificationLoading}
                        className="text-primary-600 hover:text-primary-700 underline disabled:opacity-50"
                      >
                        {verificationLoading ? 'Enviando...' : 'Enviar verificação'}
                      </button>
                      <button
                        onClick={handleCheckVerification}
                        disabled={verificationLoading}
                        className="text-primary-600 hover:text-primary-700 underline disabled:opacity-50"
                      >
                        {verificationLoading ? 'Verificando...' : 'Verificar status'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Formulários */}
        <div className="lg:col-span-2 space-y-6">
          {/* Alerta de verificação de email */}
          {!user.emailVerified && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Email não verificado
                  </h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Seu email ainda não foi verificado. Clique no botão abaixo para enviar um email de verificação.
                  </p>
                  <div className="mt-3 flex space-x-3">
                    <button
                      onClick={handleSendVerificationEmail}
                      disabled={verificationLoading}
                      className={clsx(
                        'inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
                        verificationLoading
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-primary-600 text-white hover:bg-primary-700'
                      )}
                    >
                      {verificationLoading ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                      ) : (
                        <Mail className="h-3 w-3 mr-2" />
                      )}
                      {verificationLoading ? 'Enviando...' : 'Enviar Email de Verificação'}
                    </button>
                    <button
                      onClick={handleCheckVerification}
                      disabled={verificationLoading}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      {verificationLoading ? 'Verificando...' : 'Verificar Status'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Editar Perfil */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Informações Pessoais</h3>
            </div>
            
            <form onSubmit={handleProfileSubmit} className="p-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Nome Completo
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Seu nome completo"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="picture" className="block text-sm font-medium text-gray-700">
                    URL da Foto
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Camera className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="url"
                      id="picture"
                      value={profileData.picture}
                      onChange={(e) => setProfileData(prev => ({ ...prev, picture: e.target.value }))}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="https://exemplo.com/foto.jpg"
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Cole a URL de uma imagem para usar como foto de perfil
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className={clsx(
                    'w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700'
                  )}
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>

          {/* Alterar Senha */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Alterar Senha</h3>
            </div>
            
            <form onSubmit={handlePasswordSubmit} className="p-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                    Senha Atual
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      id="currentPassword"
                      autoComplete="current-password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="block w-full pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Digite sua senha atual"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    >
                      {showPasswords.current ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    Nova Senha
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      id="newPassword"
                      autoComplete="new-password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="block w-full pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    >
                      {showPasswords.new ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirmar Nova Senha
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      id="confirmPassword"
                      autoComplete="new-password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="block w-full pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Digite a nova senha novamente"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    >
                      {showPasswords.confirm ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                  className={clsx(
                    'w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
                    loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700'
                  )}
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {loading ? 'Alterando...' : 'Alterar Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
