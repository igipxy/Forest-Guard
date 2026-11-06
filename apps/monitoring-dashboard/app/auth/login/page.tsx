'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Flame } from 'lucide-react';

export default function LoginPage(): React.JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState('operator@forestguard.id');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Operator email is required.');
      return;
    }
    document.cookie = 'fg_session=authenticated-operator; path=/; max-age=86400; SameSite=Lax';
    router.push('/dashboard');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B1220] p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-[#111827] p-6 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-[#38BDF8]">
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100">
              Forest Guard Operations Center
            </h1>
            <p className="text-xs text-slate-400">
              Fire Risk Monitoring & Live CCTV Surveillance
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-500/40 bg-red-500/10 p-2.5 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Operator Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-[#172033] px-3 py-2 text-sm text-slate-100 focus:border-[#38BDF8] focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Access Passphrase
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter operator credentials"
              className="w-full rounded-lg border border-slate-700 bg-[#172033] px-3 py-2 text-sm text-slate-100 focus:border-[#38BDF8] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#38BDF8] px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-300"
          >
            <Shield className="h-4 w-4" /> Sign In to Monitoring Center
          </button>
        </form>
      </div>
    </main>
  );
}