import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from './api.js';
import { Err, Ok, Badge, Avatar, Phases, Loading, Btn, useBusy } from './ui.jsx';

const blank = { title: '', description: '', regStart: '', regEnd: '', voteStart: '', voteEnd: '' };
const iso = (v) => v && new Date(v).toISOString();
const toLocal = (v) => { const d = new Date(v); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const fromElection = (e) => ({ title: e.title, description: e.description || '', regStart: toLocal(e.regStart), regEnd: toLocal(e.regEnd), voteStart: toLocal(e.voteStart), voteEnd: toLocal(e.voteEnd) });

// One form for both Create and Update
function ElectionForm({ initial = blank, lockedTimes = false, label, busyLabel, resetAfter, onSubmit, children }) {
  const [f, setF] = useState(initial);
  const [err, setErr] = useState('');
  const [busy, run] = useBusy();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = (ev) => {
    ev.preventDefault(); setErr('');
    return run(async () => {
      try { await onSubmit({ ...f, regStart: iso(f.regStart), regEnd: iso(f.regEnd), voteStart: iso(f.voteStart), voteEnd: iso(f.voteEnd) }); if (resetAfter) setF(blank); }
      catch (x) { setErr(x.message); }
    });
  };
  const dt = (k, text) => <div><label className="label" htmlFor={k}>{text}</label><input id={k} className="input disabled:opacity-50" type="datetime-local" required disabled={lockedTimes} value={f[k]} onChange={set(k)} /></div>;
  return (
    <form onSubmit={submit} className="panel space-y-4">
      {children}
      <div><label className="label" htmlFor="t">Title</label><input id="t" className="input" required value={f.title} onChange={set('title')} placeholder="Staff Council Chair 2027" /></div>
      <div><label className="label" htmlFor="d">Description</label><textarea id="d" className="input" rows={3} value={f.description} onChange={set('description')} /></div>
      <div className="grid gap-4 sm:grid-cols-2">{dt('regStart', 'Voter registration opens')}{dt('regEnd', 'Voter registration closes')}{dt('voteStart', 'Voting opens')}{dt('voteEnd', 'Voting closes (results publish)')}</div>
      <p className="text-xs text-soft">{lockedTimes ? 'The schedule is locked because voter registration has opened. You can still correct the title and description.' : 'Times use your local time zone. The schedule locks once voter registration opens.'}</p>
      <Err msg={err} />
      <Btn busy={busy}>{busy ? busyLabel : label}</Btn>
    </form>
  );
}

export default function Admin() {
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const [deleting, setDeleting] = useState('');
  const load = () => api('/admin/elections').then(setList).catch((x) => setErr(x.message));
  useEffect(() => { load(); }, []);
  const create = async (body) => { await api('/admin/elections', { method: 'POST', body }); await load(); };
  const del = async (e) => {
    if (!confirm(`Delete "${e.title}"? This cannot be undone.`)) return;
    setDeleting(e._id); setErr('');
    try { await api(`/admin/elections/${e._id}`, { method: 'DELETE' }); await load(); } catch (x) { setErr(x.message); }
    setDeleting('');
  };
  return (
    <>
      <div><h1 className="text-3xl font-extrabold text-white">Admin</h1><p className="text-soft">Start an election, open the candidate link, and vet who goes on the ballot.</p></div>
      <ElectionForm label="Create election" busyLabel="Creating..." resetAfter onSubmit={create}><h2 className="text-lg font-extrabold text-white">Start a new election</h2></ElectionForm>
      <Err msg={err} />
      <h2 className="text-xl font-extrabold text-white">All elections</h2>
      {!list && <Loading text="Loading elections..." />}
      {list && !list.length && <div className="panel text-soft">No elections yet.</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        {list?.map((e) => (
          <div key={e._id} className="panel space-y-3">
            <div className="flex items-start justify-between gap-2"><b className="text-white">{e.title}</b><Badge s={e.status} /></div>
            <p className="text-xs text-soft">Applications {e.candidatesOpen ? 'open' : 'closed'}. {e.pending > 0 && <span className="font-bold text-gold">{e.pending} waiting for review</span>}</p>
            <div className="flex gap-2">
              <Link to={`/admin/${e._id}`} className="btn-alt">Manage and edit</Link>
              {e.status === 'upcoming' && <Btn className="btn-alt text-bad" busy={deleting === e._id} onClick={() => del(e)}>{deleting === e._id ? 'Deleting...' : 'Delete'}</Btn>}
            </div>
          </div>
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
  const [tally, setTally] = useState({ counts: {}, total: 0 });
  const [editing, setEditing] = useState(false);
  const [working, setWorking] = useState(''); // which action is running, for button spinners
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const load = () => Promise.all([api(`/admin/elections/${id}`), api(`/admin/elections/${id}/candidates`), api(`/admin/elections/${id}/voters`), api(`/admin/elections/${id}/tally`)])
    .then(([a, b, c, d]) => { setE(a); setCands(b); setVoters(c); setTally(d); }).catch((x) => setErr(x.message));
  useEffect(() => { load(); }, [id]);
  // live refresh of the counts while voting is open
  useEffect(() => {
    if (e?.status !== 'voting') return;
    const t = setInterval(() => api(`/admin/elections/${id}/tally`).then(setTally).catch(() => {}), 10000);
    return () => clearInterval(t);
  }, [e?.status, id]);
  if (!e) return err ? <Err msg={err} /> : <Loading text="Loading election..." />;

  const link = `${location.origin}/apply/${e.applyCode}`;
  const locked = ['voting', 'closed'].includes(e.status);
  const run = (key, fn) => async () => { setWorking(key); setErr(''); setMsg(''); try { await fn(); await load(); } catch (x) { setErr(x.message); } setWorking(''); };
  const toggle = run('link', () => api(`/admin/elections/${id}/candidate-link`, { method: 'POST', body: { open: !e.candidatesOpen } }));
  const decide = (c, status) => run(`${c.id}:${status}`, () => api(`/admin/candidates/${c.id}`, { method: 'PATCH', body: { status, note: status === 'rejected' ? prompt('Reason for rejecting (shown to the applicant):') || '' : '' } }));
  const del = run('delete', async () => { if (!confirm('Delete this election? This cannot be undone.')) return; await api(`/admin/elections/${id}`, { method: 'DELETE' }); go('/admin'); });
  const save = async (body) => { await api(`/admin/elections/${id}`, { method: 'PUT', body }); await load(); setEditing(false); setMsg('Election updated.'); };
  const copy = async () => { await navigator.clipboard.writeText(link); setMsg('Link copied. Share it with staff who want to stand.'); };

  return (
    <>
      <Link to="/admin" className="text-sm font-bold text-brand">Back to admin</Link>
      <div className="flex flex-wrap items-start justify-between gap-2"><h1 className="text-3xl font-extrabold text-white">{e.title}</h1><Badge s={e.status} /></div>
      <Phases e={e} status={e.status} />
      <Err msg={err} /><Ok msg={msg} />

      <div className="flex flex-wrap gap-2">
        <button className="btn-alt" onClick={() => setEditing(!editing)}>{editing ? 'Cancel editing' : 'Edit election'}</button>
        {e.status === 'upcoming' && <Btn className="btn-alt text-bad" busy={working === 'delete'} onClick={del}>{working === 'delete' ? 'Deleting...' : 'Delete election'}</Btn>}
      </div>
      {editing && <ElectionForm initial={fromElection(e)} lockedTimes={e.status !== 'upcoming'} label="Save changes" busyLabel="Saving..." onSubmit={save}><h2 className="text-lg font-extrabold text-white">Edit election</h2></ElectionForm>}

      <div className="panel space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="text-lg font-extrabold text-white">Candidate application link</h2><p className="text-sm text-soft">Anyone with a verified work email and a completed profile can apply while the link is open.</p></div>
          <Btn className={e.candidatesOpen ? 'btn-alt' : 'btn'} busy={working === 'link'} onClick={toggle} disabled={locked}>{working === 'link' ? 'Updating...' : e.candidatesOpen ? 'Close applications' : 'Open applications'}</Btn>
        </div>
        <div className="flex gap-2"><input readOnly className="input font-mono text-xs" value={link} aria-label="Application link" /><button className="btn-alt" onClick={copy}>Copy</button></div>
        <p className="text-xs text-soft">Status: <b className={e.candidatesOpen ? 'text-good' : 'text-soft'}>{e.candidatesOpen ? 'open' : 'closed'}</b>. Applications also stop automatically when voting starts.</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-extrabold text-white">Candidate applications ({cands.length})</h2>
        {e.status === 'voting' && <p className="text-sm text-soft">Live counts refresh every 10 seconds. Only admins see them. The public sees results after voting closes.</p>}
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
                {!c.photoUrl && <p className="mt-1 text-xs font-bold text-gold">No photo. A photo is required before approval.</p>}
                {locked && c.status === 'approved' && (() => { const n = tally.counts[c.id] || 0; return (
                  <div className="mt-3"><div className="flex justify-between text-sm font-bold"><span className="text-white">{n} {n === 1 ? 'vote' : 'votes'}{e.status === 'voting' ? ' so far' : ''}</span><span>{tally.total ? Math.round((n / tally.total) * 100) : 0}%</span></div>
                    <div className="mt-1 h-2 rounded bg-raise"><div className="h-2 rounded bg-gold" style={{ width: `${tally.total ? (n / tally.total) * 100 : 0}%` }} /></div></div>); })()}
              </div>
            </div>
            {!locked && (
              <div className="flex gap-2">
                <Btn busy={working === `${c.id}:approved`} disabled={!!working || c.status === 'approved' || !c.photoUrl} onClick={decide(c, 'approved')}>{working === `${c.id}:approved` ? 'Approving...' : 'Approve'}</Btn>
                <Btn className="btn-alt" busy={working === `${c.id}:rejected`} disabled={!!working || c.status === 'rejected'} onClick={decide(c, 'rejected')}>{working === `${c.id}:rejected` ? 'Rejecting...' : 'Reject'}</Btn>
              </div>
            )}
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
    </>
  );
}
