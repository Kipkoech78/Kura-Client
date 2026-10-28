import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api.js';
import { Err, Btn, useBusy } from '../ui.jsx';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const { setUser } = useAuth();
  const go = useNavigate();
  const location = useLocation();
  const [f, setF] = useState({ email: '', name: '', code: '' });
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const [busy, run] = useBusy();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const send = (e) => { e.preventDefault(); setErr(''); return run(async () => { try { await api('/auth/request-code', { method: 'POST', body: f }); setSent(true); } catch (x) { setErr(x.message); } }); };
  
const verify = (e) => {
  e.preventDefault();
  setErr('');

  return run(async () => {
    try {
      const d = await api('/auth/verify', {
        method: 'POST',
        body: f
      });

      localStorage.setItem('token', d.token);
      setUser(d.user);

      const params = new URLSearchParams(location.search);
      const next = params.get('next') || '/';

      if (!d.user.profileComplete) {
        go(`/profile?next=${encodeURIComponent(next)}`, {
          replace: true
        });
      } else {
        go(next, { replace: true });
      }
    } catch (x) {
      setErr(x.message);
    }
  });
};

  return (
    <form onSubmit={sent ? verify : send} className="panel mx-auto mt-8 max-w-md space-y-4">
      <h1 className="text-2xl font-extrabold text-white">{sent ? 'Check your email' : 'Sign in or create your account'}</h1>
      {!sent ? (<>
        <p className="text-sm text-soft">Use your work email. We send a 6-digit code, so there is no password to remember.</p>
        <div><label className="label" htmlFor="em">Work email</label><input id="em" className="input" type="email" required value={f.email} onChange={set('email')} /></div>
        <div><label className="label" htmlFor="nm">Full name <span className="font-normal">(first time only)</span></label><input id="nm" className="input" value={f.name} onChange={set('name')} /></div>
        <Btn className="btn w-full" busy={busy}>{busy ? 'Sending code...' : 'Email me a code'}</Btn>
      </>) : (<>
        <p className="text-sm text-soft">We sent a code to {f.email}. It expires in 10 minutes.</p>
        <input className="input text-center text-2xl tracking-[0.5em]" inputMode="numeric" maxLength={6} placeholder="000000" required value={f.code} onChange={set('code')} autoFocus aria-label="6-digit code" />
        <Btn className="btn w-full" busy={busy}>{busy ? 'Verifying...' : 'Verify and continue'}</Btn>
        <button type="button" className="btn-alt w-full" disabled={busy} onClick={() => setSent(false)}>Use a different email</button>
      </>)}
      <Err msg={err} />
    </form>
  );
}
