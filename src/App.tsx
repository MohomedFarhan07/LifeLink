import { BrowserRouter, Routes, Route, Navigate, Link as RouterLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import { HomePage } from './pages/public/HomePage';
import { AboutPage } from './pages/public/AboutPage';
import { AboutUsPage } from './pages/public/AboutUsPage';
import { AwarenessPage } from './pages/public/AwarenessPage';
import { StoriesPage } from './pages/public/StoriesPage';
import { ContactPage } from './pages/public/ContactPage';
import { NewsPage } from './pages/public/NewsPage';
import { PrivacyPolicyPage, TermsOfServicePage, MedicalDisclaimerPage } from './pages/public/LegalPages';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { DonorDashboard } from './pages/dashboards/DonorDashboard';
import { HospitalDashboard } from './pages/dashboards/HospitalDashboard';
import { BloodBankDashboard } from './pages/dashboards/BloodBankDashboard';
import { AdminDashboard } from './pages/dashboards/AdminDashboard';
import { Droplet, Loader2 } from 'lucide-react';
import type { JSX } from 'react';

function DashboardRouter() {
  const { profile } = useAuth();
  if (!profile) return null;
  switch (profile.role) {
    case 'donor': return <DonorDashboard />;
    case 'hospital': return <HospitalDashboard />;
    case 'blood_bank': return <BloodBankDashboard />;
    case 'admin': return <AdminDashboard />;
    default: return <DonorDashboard />;
  }
}

function ProtectedRoute() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          <p className="text-sm text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <p className="text-sm text-slate-500">Setting up your profile...</p>
        </div>
      </div>
    );
  }

  return <DashboardRouter />;
}

function PublicOnlyRoute({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center dark:bg-slate-950">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white">
        <Droplet className="h-8 w-8" />
      </div>
      <h1 className="mt-6 text-3xl font-bold text-slate-900 dark:text-slate-100">Page not found</h1>
      <p className="mt-2 text-slate-500">The page you're looking for doesn't exist.</p>
      <RouterLink to="/" className="mt-6 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700">
        Back to Home
      </RouterLink>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/about-us" element={<AboutUsPage />} />
              <Route path="/awareness" element={<AwarenessPage />} />
              <Route path="/stories" element={<StoriesPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsOfServicePage />} />
              <Route path="/medical-disclaimer" element={<MedicalDisclaimerPage />} />
              <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
              <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
              <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
