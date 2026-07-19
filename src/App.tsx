import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link as RouterLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import { HomePage } from './pages/public/HomePage';
import { PrivacyPolicyPage, TermsOfServicePage, MedicalDisclaimerPage } from './pages/public/LegalPages';
import { Droplet, Loader2 } from 'lucide-react';
import type { JSX } from 'react';

const AboutPage = lazy(() => import('./pages/public/AboutPage').then((module) => ({ default: module.AboutPage })));
const AboutUsPage = lazy(() => import('./pages/public/AboutUsPage').then((module) => ({ default: module.AboutUsPage })));
const AwarenessPage = lazy(() => import('./pages/public/AwarenessPage').then((module) => ({ default: module.AwarenessPage })));
const StoriesPage = lazy(() => import('./pages/public/StoriesPage').then((module) => ({ default: module.StoriesPage })));
const ContactPage = lazy(() => import('./pages/public/ContactPage').then((module) => ({ default: module.ContactPage })));
const NewsPage = lazy(() => import('./pages/public/NewsPage').then((module) => ({ default: module.NewsPage })));
const PublicProfilePage = lazy(() => import('./pages/public/PublicProfilePage').then((module) => ({ default: module.PublicProfilePage })));
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage').then((module) => ({ default: module.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })));
const DonorDashboard = lazy(() => import('./pages/dashboards/DonorDashboard').then((module) => ({ default: module.DonorDashboard })));
const HospitalDashboard = lazy(() => import('./pages/dashboards/HospitalDashboard').then((module) => ({ default: module.HospitalDashboard })));
const BloodBankDashboard = lazy(() => import('./pages/dashboards/BloodBankDashboard').then((module) => ({ default: module.BloodBankDashboard })));
const AdminDashboard = lazy(() => import('./pages/dashboards/AdminDashboard').then((module) => ({ default: module.AdminDashboard })));

function RouteLoading() {
  return <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>;
}

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
            <Suspense fallback={<RouteLoading />}><Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/about-us" element={<AboutUsPage />} />
              <Route path="/awareness" element={<AwarenessPage />} />
              <Route path="/stories" element={<StoriesPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/people/:userId" element={<PublicProfilePage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsOfServicePage />} />
              <Route path="/medical-disclaimer" element={<MedicalDisclaimerPage />} />
              <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
              <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
              <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute />} />
              <Route path="*" element={<NotFound />} />
            </Routes></Suspense>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
