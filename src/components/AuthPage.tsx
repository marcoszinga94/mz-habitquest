import { useState } from 'react';
import { api, type UserData } from './app/lib/api';
import { I18nProvider, useI18n } from './app/lib/i18n';
import type { Lang } from '../lib/i18n';

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  return (
    <I18nProvider>
      <AuthPageInner mode={mode} />
    </I18nProvider>
  );
}

function AuthPageInner({ mode }: { mode: 'login' | 'register' }) {
  const { t, lang, setLang } = useI18n();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(mode === 'login' ? '/api/auth/login' : '/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(mode === 'login' ? { email, password } : { email, username, password }),
      });
      window.location.href = '/app';
    } catch (err: any) {
      const code = err?.message;
      if (code === 'invalid_credentials') setError(t('auth.error.invalid'));
      else if (code === 'email_in_use') setError(t('auth.error.email_in_use'));
      else setError(t('auth.error.generic'));
      setBusy(false);
    }
  };

  const otherHref = mode === 'login' ? '/register' : '/login';
  const otherText = mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount');

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">⚔️</div>
          <h1 className="text-2xl font-extrabold gold-text">
            {t('app.title')}
          </h1>
        </div>
        <form className="panel p-5 flex flex-col gap-3" onSubmit={submit}>
          <h2 className="font-bold text-lg text-center">
            {mode === 'login' ? t('auth.login.title') : t('auth.register.title')}
          </h2>
          {mode === 'register' && (
            <label className="flex flex-col gap-1 text-sm">
              <span>{t('auth.username')}</span>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={2} maxLength={40} />
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm">
            <span>{t('auth.email')}</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>{t('auth.password')}</span>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === 'register' ? 6 : 1} />
          </label>
          {error && <div className="text-sm text-red-400 text-center">{error}</div>}
          <button className="btn btn-primary py-2.5" disabled={busy}>
            {mode === 'login' ? t('auth.submit') : t('auth.submitRegister')}
          </button>
          <a href={otherHref} className="text-center text-sm text-indigo-300 hover:underline">
            {otherText}
          </a>
        </form>
        <div className="mt-3 flex justify-center gap-1">
          {(['es', 'en'] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1 text-xs font-bold rounded-full ${lang === l ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
            >
              {l === 'es' ? 'ES' : 'EN'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}