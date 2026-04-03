import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import Login from './pages/Login';

// Unified Dashboard
import UnifiedDashboard from './pages/Dashboard';

// HR pages
import Employees from './pages/hr/Employees';
import Cycles from './pages/hr/Cycles';
import Approvals from './pages/hr/Approvals';
import Reports from './pages/hr/Reports';
import HRCycleDetail from './pages/hr/CycleDetail';
import QuestionSets from './pages/hr/QuestionSets';

// Admin pages
import AdminSettings from './pages/admin/Settings';

// Manager pages
import Evaluate from './pages/manager/Evaluate';
import TeamReport from './pages/manager/TeamReport';

// Employee pages
import SelfReview from './pages/employee/SelfReview';
import Results from './pages/employee/Results';
import CycleDetail from './pages/employee/CycleDetail';

function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to="/login" replace />;

  const isAllowed = (role) => {
    if (role === 'admin') return true; // Admin has full access
    if (allowedRoles.includes('all')) return true; // Everyone can access 'all' roles
    if (allowedRoles.includes(role)) return true;
    if (role === 'manager' && allowedRoles.includes('employee')) return true;
    if (role === 'hr' && allowedRoles.includes('employee')) return true;
    return false;
  };

  if (allowedRoles && !isAllowed(currentUser.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function AppRoutes() {
  const { currentUser } = useApp();

  // If Supabase is currently processing an OAuth redirect in the URL hash, don't force a redirect yet
  const isOAuthRedirect = window.location.hash && window.location.hash.includes('access_token=');

  if (isOAuthRedirect && !currentUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', color: '#666' }}>
        <h2>Completing sign in...</h2>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={currentUser ? <Navigate to="/dashboard" replace /> : <Login />} />
      {/* Unified Dashboard */}
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['all']}><Layout><UnifiedDashboard /></Layout></ProtectedRoute>} />

      {/* HR Routes */}
      <Route path="/hr/cycle/:cycleId" element={<ProtectedRoute allowedRoles={['hr']}><Layout><HRCycleDetail /></Layout></ProtectedRoute>} />
      <Route path="/hr/employees" element={<ProtectedRoute allowedRoles={['hr', 'manager']}><Layout><Employees /></Layout></ProtectedRoute>} />
      <Route path="/hr/cycles" element={<ProtectedRoute allowedRoles={['hr']}><Layout><Cycles /></Layout></ProtectedRoute>} />
      <Route path="/hr/approvals" element={<ProtectedRoute allowedRoles={['hr', 'admin', 'manager']}><Layout><Approvals /></Layout></ProtectedRoute>} />
      <Route path="/hr/reports" element={<ProtectedRoute allowedRoles={['hr']}><Layout><Reports /></Layout></ProtectedRoute>} />
      <Route path="/hr/question-sets" element={<ProtectedRoute allowedRoles={['hr', 'admin']}><Layout><QuestionSets /></Layout></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><Layout><AdminSettings /></Layout></ProtectedRoute>} />

      {/* Manager Routes */}
      <Route path="/manager" element={<ProtectedRoute allowedRoles={['manager', 'admin']}><Layout><Evaluate /></Layout></ProtectedRoute>} />
      <Route path="/manager/team-report" element={<ProtectedRoute allowedRoles={['manager', 'admin']}><Layout><TeamReport /></Layout></ProtectedRoute>} />
      <Route path="/manager/evaluate/:employeeId" element={<ProtectedRoute allowedRoles={['manager', 'admin']}><Layout><Evaluate /></Layout></ProtectedRoute>} />

      {/* Employee (Baseline) Routes - Accessible by All */}
      <Route path="/employee/cycle/:cycleId" element={<ProtectedRoute allowedRoles={['all']}><Layout><CycleDetail /></Layout></ProtectedRoute>} />
      <Route path="/employee/self-review" element={<ProtectedRoute allowedRoles={['all']}><Layout><SelfReview /></Layout></ProtectedRoute>} />
      <Route path="/employee/results" element={<ProtectedRoute allowedRoles={['all']}><Layout><Results /></Layout></ProtectedRoute>} />

      {/* Redirections for old dashboard links */}
      <Route path="/hr" element={<Navigate to="/dashboard" replace />} />
      <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
      <Route path="/employee" element={<Navigate to="/dashboard" replace />} />

      {/* Default */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
