import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import AdminLayout from './components/layouts/AdminLayout';

// Lazy load admin pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const ClientList = lazy(() => import('./pages/admin/ClientList'));
const ClientDetail = lazy(() => import('./pages/admin/ClientDetail'));
const Analytics = lazy(() => import('./pages/admin/Analytics'));
const Subscriptions = lazy(() => import('./pages/admin/Subscriptions'));
const FinancialReports = lazy(() => import('./pages/admin/FinancialReports'));
const Onboarding = lazy(() => import('./pages/admin/Onboarding'));
const Announcements = lazy(() => import('./pages/admin/Announcements'));
const AuditLog = lazy(() => import('./pages/admin/AuditLog'));
const Settings = lazy(() => import('./pages/admin/Settings'));

// Lazy load baker app pages
const BakerApp = lazy(() => import('./pages/baker/App'));
const BakerMobile = lazy(() => import('./pages/baker/Mobile'));

// Loading skeleton
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-surface-950">
      <div className="text-surface-400">Loading...</div>
    </div>
  );
}

// Protected route component
function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/" replace />;

  return <>{children}</>;
}

// Root redirect — logged in users go straight to their workspace
function Home() {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;

  return <Navigate to={user.role === 'admin' ? '/admin' : '/app'} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Login */}
      <Route path="/login" element={<Login />} />

      {/* Admin Portal */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<AdminDashboard />} />
                  <Route path="/clients" element={<ClientList />} />
                  <Route path="/clients/:id" element={<ClientDetail />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/subscriptions" element={<Subscriptions />} />
                  <Route path="/financial" element={<FinancialReports />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/announcements" element={<Announcements />} />
                  <Route path="/audit-log" element={<AuditLog />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </Suspense>
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      {/* Baker App */}
      <Route
        path="/app/*"
        element={
          <ProtectedRoute requiredRole="baker">
            <Suspense fallback={<PageLoader />}>
              <BakerApp />
            </Suspense>
          </ProtectedRoute>
        }
      />

      {/* Baker Mobile */}
      <Route
        path="/m/*"
        element={
          <ProtectedRoute requiredRole="baker">
            <Suspense fallback={<PageLoader />}>
              <BakerMobile />
            </Suspense>
          </ProtectedRoute>
        }
      />

      {/* Root — straight to workspace if logged in, login if not */}
      <Route path="/" element={<Home />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
