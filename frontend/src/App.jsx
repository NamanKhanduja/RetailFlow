import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login    from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Orders    from './pages/Orders';
import Finance   from './pages/Finance';
import Employees from './pages/Employees';

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/"         element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/inventory" element={<PrivateRoute><Inventory /></PrivateRoute>} />
      <Route path="/orders"   element={<PrivateRoute><Orders /></PrivateRoute>} />
      <Route path="/finance"  element={<PrivateRoute><Finance /></PrivateRoute>} />
      <Route path="/employees" element={<PrivateRoute><Employees /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#0d1226', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13 },
            success: { iconTheme: { primary: '#10b981', secondary: '#0d1226' } },
            error:   { iconTheme: { primary: '#f43f5e', secondary: '#0d1226' } },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
