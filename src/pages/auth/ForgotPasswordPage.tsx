import { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Input } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your email and we'll send you a secure reset link.">
      {sent ? (
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Check your inbox</h2>
            <p className="mt-1.5 text-sm text-slate-500">We've sent a password reset link to <strong>{email}</strong>. The link expires in 1 hour.</p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => navigate('/login')} icon={<ArrowLeft className="h-4 w-4" />}>
            Back to Login
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <Input
            label="Email"
            type="email"
            required
            icon={<Mail className="h-4 w-4" />}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3.5 py-2.5 text-sm text-brand-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          <Button type="submit" loading={loading} className="w-full" size="lg">Send Reset Link</Button>
          <button type="button" onClick={() => navigate('/login')} className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back to login
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
