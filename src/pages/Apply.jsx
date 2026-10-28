import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Err, Avatar, PhotoUpload, Loading, Btn, useBusy } from '../ui.jsx';
import { useAuth } from '../auth.jsx';
import { forWho } from '../shared.jsx';

export default function Apply() {
  const { code } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const applicationPath = `/apply/${code}`;
  const [d, setD] = useState(null);
  const [f, setF] = useState({ positionId: '', manifesto: '', photoUrl: '' });
  const [err, setErr] = useState('');
  const [busy, run] = useBusy();
  const load = () => api(`/apply/${code}`).then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [code, user]);
  useEffect(() => {
  if (!user || !d) return;

  // A logged-in user with an incomplete profile must complete it first.
  if (!d.profileComplete) {
    navigate(
      `/profile?next=${encodeURIComponent(applicationPath)}`,
      { replace: true }
    );
  }
}, [user, d, applicationPath, navigate]);
  
  const submit = (e) => { e.preventDefault(); setErr(''); return run(async () => { try { await api(`/apply/${code}`, { method: 'POST', body: f }); setF({ positionId: '', manifesto: '', photoUrl: '' }); await load(); } catch (x) { setErr(x.message); } }); };
  if (!d) return err ? <Err msg={err} /> : <Loading text="Loading application..." />;
  const available = d.standing ? [] : d.positions.filter((p) => p.open && p.canApply && !p.mine);
  const appStatus = (p) => p.mine ? (p.mine.status === 'pending' ? 'Under review' : p.mine.status === 'approved' ? 'Approved. You are on the ballot' : `Not approved. ${p.mine.note || ''}`) : !p.open ? 'Applications closed' : p.canApply === false ? `For ${p.eligible} candidates only` : 'Open';
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div><p className="text-sm font-bold text-gold">Candidate application</p><h1 className="text-3xl font-extrabold text-white">{d.title}</h1><p className="text-soft">{d.description}</p></div>
      <div className="panel space-y-2"><h2 className="font-extrabold text-white">Seats</h2>
        {d.positions.map((p) => <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 text-sm first:border-0 first:pt-0"><span className="font-bold text-white">{p.title} {forWho(p.eligible)}</span><span className={p.mine?.status === 'approved' ? 'font-bold text-good' : 'text-soft'}>{appStatus(p)}</span></div>)}
      </div>
      {!d.open ? <div className="panel text-soft">Applications for this election are closed.</div>
        : !user ? <div className="panel space-y-3"><p>Log in with your work email to apply.</p><Link className="btn" to={`/login?next=/apply/${code}`}>Log in</Link></div>
        : !d.profileComplete ? <div className="panel space-y-3"><p>Complete your profile first. It is shown to voters next to your name.</p><Link className="btn" to="/profile">Complete profile</Link></div>
        : d.standing ? <div className="panel text-soft">You have applied for a seat. Each person can stand for only one seat per election. If your application is rejected you can apply for another.</div>
        : !available.length ? <div className="panel text-soft">There is no open seat you can apply for right now.</div>
        : (
          <form onSubmit={submit} className="panel space-y-4">
            <div className="flex items-center gap-3"><Avatar src={user.photoUrl} name={user.name} size={48} /><div><b className="text-white">{user.name}</b><p className="text-xs text-soft">{user.department}, ID {user.employeeId}</p></div></div>
            <div><label className="label" htmlFor="pos">Seat you are standing for</label>
              <select id="pos" className="input" required value={f.positionId} onChange={(e) => setF({ ...f, positionId: e.target.value })}><option value="">Choose a seat</option>{available.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
            <div><label className="label" htmlFor="m">Why should colleagues vote for you?</label><textarea id="m" className="input" rows={6} required minLength={20} maxLength={1500} value={f.manifesto} onChange={(e) => setF({ ...f, manifesto: e.target.value })} /></div>
            <PhotoUpload value={f.photoUrl} name={user.name} label={user.photoUrl ? 'Campaign photo (optional, defaults to your profile photo)' : 'Candidate photo (required to appear on the ballot)'} onChange={(photoUrl) => setF({ ...f, photoUrl })} />
            <Err msg={err} /><Btn busy={busy} disabled={!f.photoUrl && !user.photoUrl}>{busy ? 'Submitting...' : 'Submit application'}</Btn>
          </form>
        )}
    </div>
  );
}
