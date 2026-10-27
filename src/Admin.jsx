import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api, fmt } from './api.js';
import { Err, Ok, Badge, Avatar, Phases } from './ui.jsx';

const blank = { title: '', description: '', regStart: '', regEnd: '', voteStart: '', voteEnd: '' };
const iso = (v) => v && new Date(v).toISOString();

export default function Admin() {
  const [list, setList] = useState([]);
  const [f, setF] = useState(blank);
  const [err, setErr] = useState('');
  const load = () => api('/admin/elections').then(setList);
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const create = async (e) => {
    e.preventDefault(); setErr('');
    try { await api('/admin/elections', { method: 'POST', body: { ...f, regStart: iso(f.regStart), regEnd: iso(f.regEnd), voteStart: iso(f.voteStart), voteEnd: iso(f.voteEnd) } }); setF(blank); load(); } catch (x) { setErr(x.message); }
  };
  const dt = (k, label) => <div><label className="label" htmlFor={k}>{label}</label><input id={k} className="input" type="datetime-local" required value={f[k]} onChange={set(k)} /></div>;
  return (
    <>
      <div><h1 className="text-3xl font-extrabold text-white">Admin</h1><p className="text-soft">Start an election, open the candidate link, and vet who goes on the ballot.</p></div>
      <form onSubmit={create} className="panel space-y-4">
        <h2 className="text-lg font-extrabold text-white">Start a new election</h2>
        <div><label className="label" htmlFor="t">Title</label><input id="t" className="input" required value={f.title} onChange={set('title')} placeholder="Staff Council Chair 2027" /></div>
        <div><label className="label" htmlFor="d">Description</label><textarea id="d" className="input" rows={3} value={f.description} onChange={set('description')} /></div>
        <div className="grid gap-4 sm:grid-cols-2">{dt('regStart', 'Voter registration opens')}{dt('regEnd', 'Voter registration closes')}{dt('voteStart', 'Voting opens')}{dt('voteEnd', 'Voting closes (results publish)')}</div>
        <p className="text-xs text-soft">Times use your local time zone. You add candidates later by sharing the application link. The election locks once voter registration opens.</p>
        <Err msg={err} /><button className="btn">Create election</button>
      </form>
      <div className="grid gap-4 sm:grid-cols-2">
        {list.map((e) => (
          <Link key={e._id} to={`/admin/${e._id}`} className="panel space-y-2 transition hover:border-brand">
            <div className="flex items-start justify-between gap-2"><b className="text-white">{e.title}</b><Badge s={e.status} /></div>
            <p className="text-xs text-soft">Applications {e.candidatesOpen ? 'open' : 'closed'}. {e.pending > 0 && <span className="font-bold text-gold">{e.pending} waiting for review</span>}</p>
          </Link>
        ))}
      </div>
    </>
  );
}

export function AdminElection() {
  const { id } = useParams();
  const go = useNavigate();
  const [e, setE] = useState(null);
  const [cands, setCands] = useState([]);
  const [voters, setVoters] = useState([]);
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const load = () => { api(`/admin/elections/${id}`).then(setE); api(`/admin/elections/${id}/candidates`).then(setCands); api(`/admin/elections/${id}/voters`).then(setVoters); };
  useEffect(() => { load(); }, [id]);
  if (!e) return <Err msg={err} />;
  const link = `${location.origin}/apply/${e.applyCode}`;
  const run = (fn) => async () => { setErr(''); setMsg(''); try { await fn(); load(); } catch (x) { setErr(x.message); } };
  const toggle = run(() => api(`/admin/elections/${id}/candidate-link`, { method: 'POST', body: { open: !e.candidatesOpen } }));
  const decide = (c, status) => run(async () => api(`/admin/candidates/${c.id}`, { method: 'PATCH', body: { status, note: status === 'rejected' ? prompt('Reason for rejecting (shown to the applicant):') || '' : '' } }));
  const del = run(async () => { if (confirm('Delete this election?')) { await api(`/admin/elections/${id}`, { method: 'DELETE' }); go('/admin'); } });
  const copy = async () => { await navigator.clipboard.writeText(link); setMsg('Link copied. Share it with staff who want to stand.'); };
  const locked = ['voting', 'closed'].includes(e.status);
  return (
    <>
      <Link to="/admin" className="text-sm font-bold text-brand">Back to admin</Link>
      <div className="flex flex-wrap items-start justify-between gap-2"><h1 className="text-3xl font-extrabold text-white">{e.title}</h1><Badge s={e.status} /></div>
      <Phases e={e} status={e.status} />
      <Err msg={err} /><Ok msg={msg} />

      <div className="panel space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="text-lg font-extrabold text-white">Candidate application link</h2><p className="text-sm text-soft">Anyone with a verified work email and a completed profile can apply while the link is open.</p></div>
          <button className={e.candidatesOpen ? 'btn-alt' : 'btn'} onClick={toggle} disabled={locked}>{e.candidatesOpen ? 'Close applications' : 'Open applications'}</button>
        </div>
        <div className="flex gap-2"><input readOnly className="input font-mono text-xs" value={link} aria-label="Application link" /><button className="btn-alt" onClick={copy}>Copy</button></div>
        <p className="text-xs text-soft">Status: <b className={e.candidatesOpen ? 'text-good' : 'text-soft'}>{e.candidatesOpen ? 'open' : 'closed'}</b>. Applications also stop automatically when voting starts.</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-extrabold text-white">Candidate applications ({cands.length})</h2>
        {!cands.length && <div className="panel text-soft">None yet. Open the link and share it.</div>}
        {cands.map((c) => (
          <div key={c.id} className="panel space-y-3">
            <div className="flex flex-wrap items-start gap-4">
              <Avatar src={c.photoUrl} name={c.user?.name} size={72} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><b className="text-lg text-white">{c.user?.name}</b>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${c.status === 'approved' ? 'bg-good text-night' : c.status === 'rejected' ? 'bg-bad text-night' : 'bg-gold text-night'}`}>{c.status}</span></div>
                <p className="text-xs text-soft">{c.user?.department}. ID {c.user?.employeeId}. {c.user?.email}. {c.user?.phone}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{c.manifesto}</p>
                {c.note && <p className="mt-1 text-xs text-bad">Reason: {c.note}</p>}
              </div>
            </div>
            {!locked && <div className="flex gap-2"><button className="btn" disabled={c.status === 'approved'} onClick={decide(c, 'approved')}>Approve</button><button className="btn-alt" disabled={c.status === 'rejected'} onClick={decide(c, 'rejected')}>Reject</button></div>}
          </div>
        ))}
        <p className="text-xs text-soft">Approved candidates appear on the ballot. Decisions lock when voting starts, and each one is written to the public audit log.</p>
      </div>

      <div className="panel space-y-3">
        <h2 className="text-lg font-extrabold text-white">Registered voters ({voters.length})</h2>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead className="text-xs text-soft"><tr><th className="py-2 pr-3">Voter</th><th className="pr-3">Employee ID</th><th className="pr-3">Department</th><th className="pr-3">Phone</th><th>Voted</th></tr></thead>
          <tbody>{voters.map((v) => (
            <tr key={v.email} className="border-t border-line"><td className="py-2 pr-3"><span className="flex items-center gap-2"><Avatar src={v.photoUrl} name={v.name} size={32} /><span><b className="block text-white">{v.name}</b><span className="text-xs text-soft">{v.email}</span></span></span></td>
              <td className="pr-3">{v.employeeId}</td><td className="pr-3">{v.department}</td><td className="pr-3">{v.phone}</td><td className={v.voted ? 'font-bold text-good' : 'text-soft'}>{v.voted ? 'Yes' : 'No'}</td></tr>
          ))}</tbody></table></div>
        <p className="text-xs text-soft">Admins can see who voted, never who they voted for.</p>
      </div>
      {e.status === 'upcoming' && <button className="btn-alt text-bad" onClick={del}>Delete election</button>}
    </>
  );
}
