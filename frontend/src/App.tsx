import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { setAccessToken } from './lib/tokenStore';
import { apiClient } from './lib/apiClient';

// Layouts
import { DashboardLayout } from './layouts/DashboardLayout';

// Home Pages
import { LandingPage } from './features/home/LandingPage';

// Auth Pages
import { LoginForm } from './features/auth/components/LoginForm';
import { RegisterForm } from './features/auth/components/RegisterForm';

// Catalog Pages
import { CreatorList } from './features/catalog/CreatorList';
import { RequirementList } from './features/catalog/RequirementList';
import { PostRequirement } from './features/catalog/PostRequirement';
import { MyRequirements } from './features/catalog/MyRequirements';

// Engagement Pages
import { Contracts } from './features/engagement/Contracts';
import { MyProposals } from './features/engagement/MyProposals';

// Creator Pages
import { CreatorPortfolio } from './features/creator/CreatorPortfolio';
import { CreatorAiSuggestions } from './features/creator/CreatorAiSuggestions';

// Payment Pages
import { WalletLedger } from './features/payment/WalletLedger';

// Chat
import { ChatWindow } from './features/chat/ChatWindow';

// Notifications
import { NotificationsList } from './features/notification/NotificationsList';

// Manager Pages
import { PermissionGrid } from './features/dashboard-manager/PermissionGrid';
import { VerificationQueue } from './features/dashboard-manager/VerificationQueue';
import { DisputesConsole } from './features/dashboard-manager/DisputesConsole';
import { ManagerAccounts } from './features/dashboard-manager/ManagerAccounts';

interface AuthUser {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'CREATOR' | 'MANAGER';
}

// Guard wrapper
const ProtectedRoute: React.FC<{
  user: AuthUser | null;
  allowedRoles?: Array<'CUSTOMER' | 'CREATOR' | 'MANAGER'>;
  children: React.ReactNode;
}> = ({ user, allowedRoles, children }) => {
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          const res = await apiClient.post('/api/auth/refresh');
          if (res.data?.success) {
            const { accessToken, user: refreshedUser } = res.data.data;
            setAccessToken(accessToken);
            setUser(refreshedUser);
            localStorage.setItem('user', JSON.stringify(refreshedUser));
          } else {
            throw new Error();
          }
        } catch {
          setAccessToken(null);
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setHydrated(true);
    };
    initAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    }
    setAccessToken(null);
    localStorage.removeItem('user');
    setUser(null);
  };

  if (!hydrated) return null; // Wait for localStorage hydration before first render

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        
        <Route
          path="/login"
          element={user ? <Navigate to={defaultRoute(user.role)} replace /> : <LoginForm onLoginSuccess={(u) => setUser(u)} />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to={defaultRoute(user.role)} replace /> : <RegisterForm />}
        />

        {/* Protected — Customer Routes */}
        <Route
          path="/catalog/creators"
          element={
            <ProtectedRoute user={user} allowedRoles={['CUSTOMER']}>
              <DashboardLayout user={user} onLogout={handleLogout}>
                <CreatorList />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/catalog/post-requirement"
          element={
            <ProtectedRoute user={user} allowedRoles={['CUSTOMER']}>
              <DashboardLayout user={user} onLogout={handleLogout}>
                <PostRequirement />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/catalog/requirements"
          element={
            <ProtectedRoute user={user} allowedRoles={['CUSTOMER']}>
              <DashboardLayout user={user} onLogout={handleLogout}>
                <MyRequirements />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Protected — Creator Routes */}
        <Route
          path="/creator/portfolio"
          element={
            <ProtectedRoute user={user} allowedRoles={['CREATOR']}>
              <DashboardLayout user={user} onLogout={handleLogout}>
                <CreatorPortfolio />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/creator/availability"
          element={
            <ProtectedRoute user={user} allowedRoles={['CREATOR']}>
              <DashboardLayout user={user} onLogout={handleLogout}>
                {/* Availability placeholder — coming in Phase 8 */}
                <div className="p-8 text-center text-gray-500">
                  <h2 className="text-2xl font-bold mb-2">Availability Calendar</h2>
                  <p>Set your working schedule here. Coming soon.</p>
                </div>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/creator/ai-suggestions"
          element={
            <ProtectedRoute user={user} allowedRoles={['CREATOR']}>
              <DashboardLayout user={user} onLogout={handleLogout}>
                <CreatorAiSuggestions />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Protected — Shared Creator + Customer Routes */}
        <Route
          path="/engagement/proposals"
          element={
            <ProtectedRoute user={user} allowedRoles={['CREATOR']}>
              <DashboardLayout user={user} onLogout={handleLogout}>
                <MyProposals />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/engagement/contracts"
          element={
            <ProtectedRoute user={user} allowedRoles={['CUSTOMER', 'CREATOR']}>
              <DashboardLayout user={user} onLogout={handleLogout}>
                <Contracts />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/catalog/browse-requirements"
          element={
            <ProtectedRoute user={user} allowedRoles={['CREATOR']}>
              <DashboardLayout user={user} onLogout={handleLogout}>
                <RequirementList />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Chat — Shared */}
        <Route
          path="/chat"
          element={
            <ProtectedRoute user={user} allowedRoles={['CUSTOMER', 'CREATOR']}>
              <DashboardLayout user={user} onLogout={handleLogout}>
                <ChatWindow />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Notifications — Shared */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute user={user} allowedRoles={['CUSTOMER', 'CREATOR', 'MANAGER']}>
              <DashboardLayout user={user} onLogout={handleLogout}>
                <NotificationsList />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Payment — Shared */}
        <Route
          path="/payment/ledger"
          element={
            <ProtectedRoute user={user} allowedRoles={['CUSTOMER', 'CREATOR']}>
              <DashboardLayout user={user} onLogout={handleLogout}>
                <WalletLedger />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Manager Routes */}
        <Route
          path="/manager/rbac"
          element={
            <ProtectedRoute user={user} allowedRoles={['MANAGER']}>
              <DashboardLayout user={user} onLogout={handleLogout}>
                <PermissionGrid />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/verify"
          element={
            <ProtectedRoute user={user} allowedRoles={['MANAGER']}>
              <DashboardLayout user={user} onLogout={handleLogout}>
                <VerificationQueue />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/disputes"
          element={
            <ProtectedRoute user={user} allowedRoles={['MANAGER']}>
              <DashboardLayout user={user} onLogout={handleLogout}>
                <DisputesConsole />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/accounts"
          element={
            <ProtectedRoute user={user} allowedRoles={['MANAGER']}>
              <DashboardLayout user={user} onLogout={handleLogout}>
                <ManagerAccounts />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to={user ? defaultRoute(user.role) : '/'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function defaultRoute(role: string) {
  if (role === 'MANAGER') return '/manager/rbac';
  if (role === 'CREATOR') return '/creator/portfolio';
  return '/catalog/creators';
}

export default App;
