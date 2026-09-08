import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import WalletPage from './pages/WalletPage';
import SendPaymentPage from './pages/SendPaymentPage';
import PaymentHistoryPage from './pages/PaymentHistoryPage';
import PaymentDetailsPage from './pages/PaymentDetailsPage';
import PayFlowTracePage from './pages/PayFlowTracePage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AuditLogsPage from './pages/AuditLogsPage';

const ProtectedLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-mono text-xs">
        Authenticating PayFlow session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-h-[calc(100vh-65px)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const AdminRoute = () => {
  const { user } = useAuth();
  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Application Routes */}
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/send" element={<SendPaymentPage />} />
            <Route path="/payments" element={<PaymentHistoryPage />} />
            <Route path="/payments/:paymentId" element={<PaymentDetailsPage />} />
            <Route path="/payments/:paymentId/trace" element={<PayFlowTracePage />} />

            {/* Admin Routes */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
