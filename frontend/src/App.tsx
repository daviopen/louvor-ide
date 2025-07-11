import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import HomePage from './pages/HomePage';
import TestIntegration from './pages/TestIntegration';
import AddMusicPage from './pages/AddMusicPage';
import SearchPage from './pages/SearchPage';
import SimpleTest from './pages/TestPage';
import EditMusicPage from './pages/EditMusicPage';
import AddMinisterPage from './pages/AddMinisterPage';
import EditMinisterPage from './pages/EditMinisterPage';
import ViewMinisterPage from './pages/ViewMinisterPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProfilePage from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';
import CreateUserPage from './pages/CreateUserPage';
import { EditUserPage } from './pages/EditUserPage';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Rotas de autenticação (públicas) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Todas as rotas requerem autenticação */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<HomePage />} />
            <Route path="test-simple" element={<SimpleTest />} />
            <Route path="test" element={<TestIntegration />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="add" element={<AddMusicPage />} />
            <Route path="edit/:id" element={<EditMusicPage />} />
            <Route path="profile" element={<ProfilePage />} />
            
            {/* Rotas de administração - substitui a página de ministros */}
            <Route path="admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPage />
              </ProtectedRoute>
            } />
            <Route path="admin/create-user" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <CreateUserPage />
              </ProtectedRoute>
            } />
            <Route path="admin/edit-user/:userId" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <EditUserPage />
              </ProtectedRoute>
            } />
            <Route path="ministers" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPage />
              </ProtectedRoute>
            } />
            <Route path="ministers/add" element={
              <ProtectedRoute allowedRoles={['admin', 'minister']}>
                <AddMinisterPage />
              </ProtectedRoute>
            } />
            <Route path="ministers/edit/:id" element={
              <ProtectedRoute allowedRoles={['admin', 'minister']}>
                <EditMinisterPage />
              </ProtectedRoute>
            } />
            <Route path="ministers/:id" element={<ViewMinisterPage />} />
            
            {/* Rota de administração - apenas para admins */}
            <Route path="admin" element={
              <ProtectedRoute requireAdmin={true}>
                <AdminPage />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
