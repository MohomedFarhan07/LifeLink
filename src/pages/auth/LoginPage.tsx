import { useState } from 'react';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Input } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error.includes('Invalid login') ? 'Invalid email or password. Please try again.' : error);
      return;
    }
    toast('Welcome back!');
    navigate('/dashboard');
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your LifeLink account to continue.">
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
        <Input
          label="Password"
          type="password"
          required
          icon={<Lock className="h-4 w-4" />}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
            Remember me
          </label>
          <button type="button" onClick={() => navigate('/forgot-password')} className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Forgot password?
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3.5 py-2.5 text-sm text-brand-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <Button type="submit" loading={loading} className="w-full" size="lg">Sign In</Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Don't have an account?{' '}
        <button onClick={() => navigate('/register')} className="font-semibold text-brand-600 hover:text-brand-700">
          Create one
        </button>
      </p>
    </AuthLayout>
  );
}
