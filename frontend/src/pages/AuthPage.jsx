import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const { login, register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
      setBusy(false);
    }
  };

  const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-slate-800">
          {isLogin ? 'Login' : 'Create account'}
        </h1>

        {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {!isLogin && (
          <input name="name" placeholder="Name" value={form.name} onChange={onChange} className={input} required />
        )}
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={onChange} className={input} required />
        <input name="password" type="password" placeholder="Password (min 8 characters)" value={form.password} onChange={onChange} className={input} required />

        <button disabled={busy} className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          {busy ? 'Please wait...' : isLogin ? 'Login' : 'Register'}
        </button>

        <p className="text-center text-sm text-slate-600">
          {isLogin ? 'No account? ' : 'Already have an account? '}
          <Link to={isLogin ? '/register' : '/login'} className="text-indigo-600 hover:underline">
            {isLogin ? 'Register' : 'Login'}
          </Link>
        </p>
      </form>
    </div>
  );
}