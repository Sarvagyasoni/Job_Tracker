import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth';
import { ToastProvider } from './components/common';
import { Layout } from './components/layout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { PublicRoute } from './components/common/PublicRoute';
import { Login, Register, Dashboard, Applications, Suggestions, Resume, NotFound } from './pages';
import { isFeatureEnabled } from './config/features';
import { ProfileOnboarding, ProfilePage, ProfileGate } from './features/profile';

function AppRoutes() {
  const profileEnabled = isFeatureEnabled('profile');
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {profileEnabled && (
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <ProfileOnboarding />
            </ProtectedRoute>
          }
        />
      )}

      <Route
        element={
          <ProtectedRoute>
            {profileEnabled ? <ProfileGate><Layout /></ProfileGate> : <Layout />}
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/suggestions" element={<Suggestions />} />
        <Route path="/resume" element={<Resume />} />
        {profileEnabled && <Route path="/profile" element={<ProfilePage />} />}
        <Route index element={<Navigate to="/dashboard" replace />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;