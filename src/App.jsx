import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import Login from './pages/Login';

// HR pages
import HRDashboard from './pages/hr/Dashboard';
import Employees from './pages/hr/Employees';
import Cycles from './pages/hr/Cycles';
import Approvals from './pages/hr/Approvals';
import Reports from './pages/hr/Reports';
import HRGoals from './pages/hr/Goals';

// Manager pages
import ManagerDashboard from './pages/manager/Dashboard';
import Goals from './pages/manager/Goals';
import Evaluate from './pages/manager/Evaluate';
import TeamReport from './pages/manager/TeamReport';

// Employee pages
import EmployeeDashboard from './pages/employee/Dashboard';
import EmployeeGoals from './pages/employee/Goals';
import SelfReview from './pages/employee/SelfReview';
import Results from './pages/employee/Results';
import CycleDetail from './pages/employee/CycleDetail';
import WireframeMockup from './pages/WireframeMockup';

function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to="/login" replace />;

  const isAllowed = (role) => {
    if (role === 'admin') return true;
    if (allowedRoles.includes(role)) return true;
    if (role === 'manager' && allowedRoles.includes('employee')) return true;
    return false;
  };

  if (allowedRoles && !isAllowed(currentUser.role)) {
    if (currentUser.role === 'hr') return <Navigate to="/hr" replace />;
    if (currentUser.role === 'manager') return <Navigate to="/manager" replace />;
    return <Navigate to="/employee" replace />;
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
      <Route path="/login" element={currentUser ? <Navigate to={`/${currentUser.role}`} replace /> : <Login />} />
      <Route path="/wireframes" element={<WireframeMockup />} />

      {/* HR Routes */}
      <Route path="/hr" element={<ProtectedRoute allowedRoles={['hr']}><Layout><HRDashboard /></Layout></ProtectedRoute>} />
      <Route path="/hr/employees" element={<ProtectedRoute allowedRoles={['hr']}><Layout><Employees /></Layout></ProtectedRoute>} />
      <Route path="/hr/cycles" element={<ProtectedRoute allowedRoles={['hr']}><Layout><Cycles /></Layout></ProtectedRoute>} />
      <Route path="/hr/approvals" element={<ProtectedRoute allowedRoles={['hr']}><Layout><Approvals /></Layout></ProtectedRoute>} />
      <Route path="/hr/reports" element={<ProtectedRoute allowedRoles={['hr']}><Layout><Reports /></Layout></ProtectedRoute>} />
      <Route path="/hr/goals" element={<ProtectedRoute allowedRoles={['hr']}><Layout><HRGoals /></Layout></ProtectedRoute>} />

      {/* Manager Routes */}
      <Route path="/manager" element={<ProtectedRoute allowedRoles={['manager']}><Layout><ManagerDashboard /></Layout></ProtectedRoute>} />
      <Route path="/manager/goals" element={<ProtectedRoute allowedRoles={['manager']}><Layout><Goals /></Layout></ProtectedRoute>} />
      <Route path="/manager/evaluate" element={<ProtectedRoute allowedRoles={['manager']}><Layout><Evaluate /></Layout></ProtectedRoute>} />
      <Route path="/manager/evaluate/:employeeId" element={<ProtectedRoute allowedRoles={['manager']}><Layout><Evaluate /></Layout></ProtectedRoute>} />
      <Route path="/manager/team-report" element={<ProtectedRoute allowedRoles={['manager']}><Layout><TeamReport /></Layout></ProtectedRoute>} />

      {/* Employee Routes */}
      <Route path="/employee" element={<ProtectedRoute allowedRoles={['employee']}><Layout><EmployeeDashboard /></Layout></ProtectedRoute>} />
      <Route path="/employee/cycle/:cycleId" element={<ProtectedRoute allowedRoles={['employee']}><Layout><CycleDetail /></Layout></ProtectedRoute>} />
      <Route path="/employee/goals" element={<ProtectedRoute allowedRoles={['employee']}><Layout><EmployeeGoals /></Layout></ProtectedRoute>} />
      <Route path="/employee/self-review" element={<ProtectedRoute allowedRoles={['employee']}><Layout><SelfReview /></Layout></ProtectedRoute>} />
      <Route path="/employee/results" element={<ProtectedRoute allowedRoles={['employee']}><Layout><Results /></Layout></ProtectedRoute>} />

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
