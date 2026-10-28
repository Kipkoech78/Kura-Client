import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Err, Badge, Loading, Btn } from '../ui.jsx';
import { PageHeader } from './helpers.jsx';

export default function Elections() {
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const [deleting, setDeleting] = useState('');
  const load = () => api('/admin/elections').then(setList).catch((x) => setErr(x.message));
  useEffect(() => { load(); }, []);
  const del = async (e) => {
    if (!confirm(`Delete "${e.title}"? This cannot be undone.`)) return;
    setDeleting(e._id); setErr('');
    try { await api(`/admin/elections/${e._id}`, { method: 'DELETE' }); await load(); } catch (x) { setErr(x.message); }
    setDeleting('');
  };
  return (
    <>
      <PageHeader title="Elections" sub="Every election you have scheduled."><Link to="/admin/elections/new" className="btn">New election</Link></PageHeader>
      <Err msg={err} />
      {!list && !err && <Loading text="Loading elections..." />}
      {list && !list.length && <div className="panel text-soft">No elections yet. <Link to="/admin/elections/new" className="font-bold text-brand underline">Create the first one</Link>.</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        {list?.map((e) => (
          <div key={e._id} className="panel space-y-3">
            <div className="flex items-start justify-between gap-2"><Link to={`/admin/elections/${e._id}`} className="font-extrabold text-white hover:text-brand">{e.title}</Link><Badge s={e.status} /></div>
            <p className="text-xs text-soft">{e.seats} seats. Applications {e.candidatesOpen ? 'open' : 'closed'}. {e.pending > 0 && <span className="font-bold text-gold">{e.pending} waiting for review</span>}</p>
            <div className="flex flex-wrap gap-2">
              <Link to={`/admin/elections/${e._id}`} className="btn-alt">Open</Link>
              <Link to={`/admin/elections/${e._id}/edit`} className="btn-alt">Edit</Link>
              <Link to={`/admin/candidates/${e._id}`} className="btn-alt">Candidates</Link>
              {e.status === 'upcoming' && <Btn className="btn-alt text-bad" busy={deleting === e._id} disabled={!!deleting} onClick={() => del(e)}>{deleting === e._id ? 'Deleting...' : 'Delete'}</Btn>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
