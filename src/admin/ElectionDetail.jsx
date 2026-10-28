import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api, fmt } from '../api.js';
import { Err, Ok, Badge, Phases, Loading, Btn } from '../ui.jsx';
import { SEAT } from '../shared.jsx';
import { tag, PageHeader } from './helpers.jsx';

export default function ElectionDetail() {
  const { id } = useParams();
  const go = useNavigate();
  const [e, setE] = useState(null);
  const [working, setWorking] = useState('');
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const load = () => api(`/admin/elections/${id}`).then(setE).catch((x) => setErr(x.message));
  useEffect(() => { setE(null); load(); }, [id]);
  if (!e) return err ? <Err msg={err} /> : <Loading text="Loading election..." />;

  const link = `${location.origin}/apply/${e.applyCode}`;
  const upcoming = e.status === 'upcoming';
  const run = (key, fn) => async () => { setWorking(key); setErr(''); setMsg(''); try { await fn(); await load(); } catch (x) { setErr(x.message); } setWorking(''); };
  const toggle = run('link', () => api(`/admin/elections/${id}/candidate-link`, { method: 'POST', body: { open: !e.candidatesOpen } }));
  const del = run('delete', async () => { if (!confirm('Delete this election and all its seats? This cannot be undone.')) return; await api(`/admin/elections/${id}`, { method: 'DELETE' }); go('/admin/elections'); });
  const copy = async () => { await navigator.clipboard.writeText(link); setMsg('Link copied. Share it with people who want to stand.'); };

  return (
    <>
      <Link to="/admin/elections" className="text-sm font-bold text-brand">Back to elections</Link>
      <PageHeader title={e.title} sub={e.description}><Badge s={e.status} /></PageHeader>
      <Phases e={e} status={e.status} />
      <Err msg={err} /><Ok msg={msg} />

      <div className="flex flex-wrap gap-2">
        <Link to={`/admin/elections/${id}/edit`} className="btn-alt">Edit election and seats</Link>
        <Link to={`/admin/candidates/${id}`} className="btn-alt">Review candidates</Link>
        <Link to={`/admin/voters/${id}`} className="btn-alt">View voters</Link>
        {upcoming && <Btn className="btn-alt text-bad" busy={working === 'delete'} onClick={del}>{working === 'delete' ? 'Deleting...' : 'Delete election'}</Btn>}
      </div>

      <div className="panel space-y-3">
        <h2 className="text-lg font-extrabold text-white">Seats in voting order</h2>
        {e.positions.map((p, i) => (
          <div key={p.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
            <p className="flex flex-wrap items-center gap-2 font-bold text-white">Step {i + 1}: {p.title} {tag(p.eligible)}</p>
            <p className="text-xs text-soft">{fmt(p.voteStart)} to {fmt(p.voteEnd)}. {SEAT[p.status]}</p>
          </div>
        ))}
      </div>

      <div className="panel space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="text-lg font-extrabold text-white">Candidate application link</h2><p className="text-sm text-soft">Anyone with a verified work email and a completed profile can apply for a seat they are eligible for while the link is open.</p></div>
          <Btn className={e.candidatesOpen ? 'btn-alt' : 'btn'} busy={working === 'link'} onClick={toggle}>{working === 'link' ? 'Updating...' : e.candidatesOpen ? 'Close applications' : 'Open applications'}</Btn>
        </div>
        <div className="flex gap-2"><input readOnly className="input font-mono text-xs" value={link} aria-label="Application link" /><button className="btn-alt" onClick={copy}>Copy</button></div>
        <p className="text-xs text-soft">Status: <b className={e.candidatesOpen ? 'text-good' : 'text-soft'}>{e.candidatesOpen ? 'open' : 'closed'}</b>. Applications for each seat stop automatically when that seat's voting starts.</p>
      </div>
    </>
  );
}
