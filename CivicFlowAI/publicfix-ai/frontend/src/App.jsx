import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CitizenDashboard from './pages/CitizenDashboard';
import NewComplaintPage from './pages/NewComplaintPage';
import ComplaintDetailPage from './pages/ComplaintDetailPage';
import OfficerDashboard from './pages/OfficerDashboard';
import VerificationPage from './pages/VerificationPage';
import AdminPage from './pages/AdminPage';
import Navbar from './components/Navbar';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="spinner" style={{width:'2rem',height:'2rem'}}></div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={user ? <Navigate to={getDashboard(user.role)} replace /> : <LoginPage />} />
          <Route path="/register" element={user ? <Navigate to={getDashboard(user.role)} replace /> : <RegisterPage />} />

          <Route path="/dashboard" element={
            <ProtectedRoute roles={['citizen']}>
              <CitizenDashboard />
            </ProtectedRoute>
          } />
          <Route path="/report" element={
            <ProtectedRoute roles={['citizen']}>
              <NewComplaintPage />
            </ProtectedRoute>
          } />
          <Route path="/complaint/:complaintId" element={
            <ProtectedRoute>
              <ComplaintDetailPage />
            </ProtectedRoute>
          } />
          <Route path="/complaint/:complaintId/verify" element={
            <ProtectedRoute>
              <VerificationPage />
            </ProtectedRoute>
          } />
          <Route path="/officer" element={
            <ProtectedRoute roles={['officer']}>
              <OfficerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute roles={['admin']}>
              <AdminPage />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

function getDashboard(role) {
  if (role === 'officer') return '/officer';
  if (role === 'admin') return '/admin';
  return '/dashboard';
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
            },
            success: { iconTheme: { primary: '#4ade80', secondary: '#1e293b' } },
            error: { iconTheme: { primary: '#f87171', secondary: '#1e293b' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
