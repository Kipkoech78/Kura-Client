import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Err, Avatar, Loading, Btn } from '../ui.jsx';
import { SEAT } from '../shared.jsx';
import { tag, PageHeader } from './helpers.jsx';
import { useElectionPick } from './ElectionPicker.jsx';

export default function Candidates() {
  const { id, list, picker } = useElectionPick('/admin/candidates');
  const [e, setE] = useState(null);
  const [cands, setCands] = useState([]);
  const [tally, setTally] = useState({ counts: {}, totals: {} });
  const [working, setWorking] = useState('');
  const [err, setErr] = useState('');
  const load = () => Promise.all([api(`/admin/elections/${id}`), api(`/admin/elections/${id}/candidates`), api(`/admin/elections/${id}/tally`)])
    .then(([a, b, d]) => { setE(a); setCands(b); setTally(d); }).catch((x) => setErr(x.message));
  useEffect(() => { if (!id) return; setE(null); setErr(''); load(); }, [id]);
  const voting = e?.positions.some((p) => p.status === 'open');
  useEffect(() => { // live refresh of the counts while any seat is open
    if (!voting) return;
    const t = setInterval(() => api(`/admin/elections/${id}/tally`).then(setTally).catch(() => {}), 10000);
    return () => clearInterval(t);
  }, [voting, id]);

  const run = (key, fn) => async () => { setWorking(key); setErr(''); try { await fn(); await load(); } catch (x) { setErr(x.message); } setWorking(''); };
  const decide = (c, status) => run(`${c.id}:${status}`, () => api(`/admin/candidates/${c.id}`, { method: 'PATCH', body: { status, note: status === 'rejected' ? prompt('Reason for rejecting (shown to the applicant):') || '' : '' } }));

  if (!list) return <Loading text="Loading elections..." />;
  return (
    <>
      <PageHeader title="Candidates" sub="Review applications and approve who goes on each ballot." />
      {picker}
      {!list.length && <div className="panel text-soft">No elections yet.</div>}
      <Err msg={err} />
      {list.length > 0 && !e && !err && <Loading text="Loading candidates..." />}
      {e && (
      <div className="space-y-4">
                {voting && <p className="text-sm text-soft">Live counts refresh every 10 seconds. Only admins see them. The public sees results when the election ends.</p>}
        {e.positions.map((p) => {
          const list = cands.filter((c) => c.position === p.id);
          const locked = p.status !== 'upcoming';
          return (
            <div key={p.id} className="space-y-3">
              <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-extrabold text-white">{p.title}</h3>{tag(p.eligible)}<span className="text-xs text-soft">{SEAT[p.status]}. {list.length} applicants, {list.filter((c) => c.status === 'approved').length} approved{locked && `. ${tally.counts[`abstain:${p.id}`] || 0} abstained`}</span></div>
              {!list.length && <div className="panel text-sm text-soft">No applications for this seat yet.</div>}
              {list.map((c) => (
                <div key={c.id} className="panel space-y-3">
                  <div className="flex flex-wrap items-start gap-4">
                    <Avatar src={c.photoUrl} name={c.user?.name} size={72} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><b className="text-lg text-white">{c.user?.name}</b>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${c.status === 'approved' ? 'bg-good text-night' : c.status === 'rejected' ? 'bg-bad text-night' : 'bg-gold text-night'}`}>{c.status}</span></div>
                      <p className="text-xs text-soft">{c.user?.department}. ID {c.user?.employeeId}. {c.user?.gender}. {c.user?.email}. {c.user?.phone}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm">{c.manifesto}</p>
                      {c.note && <p className="mt-1 text-xs text-bad">Reason: {c.note}</p>}
                      {!c.photoUrl && <p className="mt-1 text-xs font-bold text-gold">No photo. A photo is required before approval.</p>}
                      {locked && c.status === 'approved' && (() => { const n = tally.counts[c.id] || 0; const t = tally.totals[p.id] || 0; return (
                        <div className="mt-3"><div className="flex justify-between text-sm font-bold"><span className="text-white">{n} {n === 1 ? 'vote' : 'votes'}{p.status === 'open' ? ' so far' : ''}</span><span>{t ? Math.round((n / t) * 100) : 0}%</span></div>
                          <div className="mt-1 h-2 rounded bg-raise"><div className="h-2 rounded bg-gold" style={{ width: `${t ? (n / t) * 100 : 0}%` }} /></div></div>); })()}
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
            </div>
          );
        })}
        <p className="text-xs text-soft">A seat needs at least one approved candidate. Voters can also abstain, and each person can stand for only one seat. Decisions lock when that seat's voting starts, and each one is written to the public audit log.</p>
      </div>
      )}
    </>
  );
}
