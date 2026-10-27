import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api, fmt } from './api.js';
import { Err, Ok, Badge, Avatar, Phases, Loading, Btn, useBusy } from './ui.jsx';

const iso = (v) => v && new Date(v).toISOString();
const toLocal = (v) => { const d = new Date(v); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const EL = { any: 'Everyone', female: 'Female only', male: 'Male only' };
const tag = (el) => el !== 'any' && <span className="rounded-full border border-gold/50 px-2 py-0.5 text-xs font-bold text-gold">{EL[el]}</span>;
const SEAT = { upcoming: 'Scheduled', open: 'Voting open', closed: 'Closed' };

// Lowest seat first: the order here is the order the seats are voted in
const PRESETS = {
  University: [['Sports Council Member', 'any'], ['Hostel Council Member', 'any'], ['Hostel Captain (Female)', 'female'], ['Hostel Captain (Male)', 'male'], ['President', 'any']],
  Company: [['Head of HR', 'any'], ['Head of Finance', 'any'], ['Head of Marketing', 'any'], ['Head of ICT', 'any']],
};
const seat = ([title, eligible]) => ({ title, eligible });
const blank = { title: '', description: '', regStart: '', regEnd: '', voteStart: '', voteEnd: '', positions: [{ title: '', eligible: 'any' }] };

function CreateElection({ onCreated }) {
  const [f, setF] = useState(blank);
  const [err, setErr] = useState('');
  const [busy, run] = useBusy();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setSeat = (i, k, v) => setF({ ...f, positions: f.positions.map((p, j) => (j === i ? { ...p, [k]: v } : p)) });
  const move = (i, d) => { const ps = [...f.positions]; const j = i + d; if (j < 0 || j >= ps.length) return; [ps[i], ps[j]] = [ps[j], ps[i]]; setF({ ...f, positions: ps }); };
  const submit = (e) => {
    e.preventDefault(); setErr('');
    return run(async () => {
      try { await api('/admin/elections', { method: 'POST', body: { ...f, regStart: iso(f.regStart), regEnd: iso(f.regEnd), voteStart: iso(f.voteStart), voteEnd: iso(f.voteEnd) } }); setF(blank); await onCreated(); }
      catch (x) { setErr(x.message); }
    });
  };
  const dt = (k, text) => <div><label className="label" htmlFor={k}>{text}</label><input id={k} className="input" type="datetime-local" required value={f[k]} onChange={set(k)} /></div>;
  return (
    <form onSubmit={submit} className="panel space-y-4">
      <h2 className="text-lg font-extrabold text-white">Start a new election</h2>
      <div><label className="label" htmlFor="t">Title</label><input id="t" className="input" required value={f.title} onChange={set('title')} placeholder="Student Union Elections 2027" /></div>
      <div><label className="label" htmlFor="d">Description</label><textarea id="d" className="input" rows={2} value={f.description} onChange={set('description')} /></div>
      <div className="grid gap-4 sm:grid-cols-2">{dt('regStart', 'Voter registration opens')}{dt('regEnd', 'Voter registration closes')}</div>

      <div className="space-y-3 rounded-xl border border-line p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-extrabold text-white">Ballot seats</h3><p className="text-xs text-soft">Voters can move between seats, revise choices, and submit all eligible choices together before voting closes.</p></div>
          <div className="flex gap-2">{Object.entries(PRESETS).map(([n, ps]) => <button type="button" key={n} className="btn-alt" onClick={() => setF({ ...f, positions: ps.map(seat) })}>{n} example</button>)}</div></div>
        {f.positions.map((p, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <span className="w-6 text-center text-sm font-bold text-soft">{i + 1}</span>
            <input className="input min-w-0 flex-1" aria-label={`Seat ${i + 1} title`} placeholder="e.g. Head of ICT" value={p.title} onChange={(e) => setSeat(i, 'title', e.target.value)} />
            <select className="input w-36" aria-label={`Seat ${i + 1} eligibility`} value={p.eligible} onChange={(e) => setSeat(i, 'eligible', e.target.value)}><option value="any">Everyone</option><option value="female">Female only</option><option value="male">Male only</option></select>
            <button type="button" className="btn-alt px-3" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>Up</button>
            <button type="button" className="btn-alt px-3" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === f.positions.length - 1}>Down</button>
            <button type="button" className="btn-alt px-3 text-bad" aria-label="Remove seat" onClick={() => setF({ ...f, positions: f.positions.filter((_, j) => j !== i) })} disabled={f.positions.length === 1}>Remove</button>
          </div>
        ))}
        <button type="button" className="btn-alt" onClick={() => setF({ ...f, positions: [...f.positions, { title: '', eligible: 'any' }] })}>Add a seat</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {dt('voteStart', 'Voting opens')}
        {dt('voteEnd', 'Voting closes')}
      </div>
      <p className="text-xs text-soft">Times use your local time zone. Every seat shares this voting window. Voters can review and revise choices until they submit one complete ballot. The schedule locks once voter registration opens.</p>
      <Err msg={err} /><Btn busy={busy}>{busy ? 'Creating...' : 'Create election'}</Btn>
    </form>
  );
}

export default function Admin() {
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
      <div><h1 className="text-3xl font-extrabold text-white">Admin</h1><p className="text-soft">Create an election with its seats, open the candidate link, and vet who goes on each ballot.</p></div>
      <CreateElection onCreated={load} />
      <Err msg={err} />
      <h2 className="text-xl font-extrabold text-white">All elections</h2>
      {!list && <Loading text="Loading elections..." />}
      {list && !list.length && <div className="panel text-soft">No elections yet.</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        {list?.map((e) => (
          <div key={e._id} className="panel space-y-3">
            <div className="flex items-start justify-between gap-2"><b className="text-white">{e.title}</b><Badge s={e.status} /></div>
            <p className="text-xs text-soft">{e.seats} seats. Applications {e.candidatesOpen ? 'open' : 'closed'}. {e.pending > 0 && <span className="font-bold text-gold">{e.pending} waiting for review</span>}</p>
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

function BasicsForm({ e, onSave }) {
  const [f, setF] = useState({ title: e.title, description: e.description || '', regStart: toLocal(e.regStart), regEnd: toLocal(e.regEnd) });
  const [err, setErr] = useState('');
  const [busy, run] = useBusy();
  const locked = e.status !== 'upcoming';
  const set = (k) => (ev) => setF({ ...f, [k]: ev.target.value });
  const submit = (ev) => { ev.preventDefault(); setErr(''); return run(async () => { try { await onSave({ ...f, regStart: iso(f.regStart), regEnd: iso(f.regEnd) }); } catch (x) { setErr(x.message); } }); };
  return (
    <form onSubmit={submit} className="panel space-y-4">
      <h2 className="text-lg font-extrabold text-white">Edit election</h2>
      <div><label className="label" htmlFor="et">Title</label><input id="et" className="input" required value={f.title} onChange={set('title')} /></div>
      <div><label className="label" htmlFor="ed">Description</label><textarea id="ed" className="input" rows={3} value={f.description} onChange={set('description')} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="rs">Voter registration opens</label><input id="rs" className="input disabled:opacity-50" type="datetime-local" required disabled={locked} value={f.regStart} onChange={set('regStart')} /></div>
        <div><label className="label" htmlFor="re">Voter registration closes</label><input id="re" className="input disabled:opacity-50" type="datetime-local" required disabled={locked} value={f.regEnd} onChange={set('regEnd')} /></div>
      </div>
      <p className="text-xs text-soft">{locked ? 'The schedule is locked because voter registration has opened. You can still correct the title and description.' : 'Registration must close before the first seat opens.'}</p>
      <Err msg={err} /><Btn busy={busy}>{busy ? 'Saving...' : 'Save changes'}</Btn>
    </form>
  );
}

function SeatForm({ initial, label, onSubmit, onCancel }) {
  const [f, setF] = useState(initial);
  const [err, setErr] = useState('');
  const [busy, run] = useBusy();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = (e) => { e.preventDefault(); setErr(''); return run(async () => { try { await onSubmit({ ...f, voteStart: iso(f.voteStart), voteEnd: iso(f.voteEnd) }); } catch (x) { setErr(x.message); } }); };
  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-line bg-night/40 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">Seat title</label><input className="input" required value={f.title} onChange={set('title')} /></div>
        <div><label className="label">Who can vote and stand</label><select className="input" value={f.eligible} onChange={set('eligible')}><option value="any">Everyone</option><option value="female">Female only</option><option value="male">Male only</option></select></div>
        <p className="text-sm text-soft sm:col-span-2">All seats use the election-wide voting window: {fmt(initial.voteStart)} to {fmt(initial.voteEnd)}.</p>
      </div>
      <Err msg={err} />
      <div className="flex gap-2"><Btn busy={busy}>{busy ? 'Saving...' : label}</Btn>{onCancel && <button type="button" className="btn-alt" onClick={onCancel}>Cancel</button>}</div>
    </form>
  );
}

export function AdminElection() {
  const { id } = useParams();
  const go = useNavigate();
  const [e, setE] = useState(null);
  const [cands, setCands] = useState([]);
  const [voters, setVoters] = useState([]);
  const [tally, setTally] = useState({ counts: {}, totals: {} });
  const [editing, setEditing] = useState(false);
  const [editSeat, setEditSeat] = useState('');
  const [adding, setAdding] = useState(false);
  const [working, setWorking] = useState('');
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const load = () => Promise.all([api(`/admin/elections/${id}`), api(`/admin/elections/${id}/candidates`), api(`/admin/elections/${id}/voters`), api(`/admin/elections/${id}/tally`)])
    .then(([a, b, c, d]) => { setE(a); setCands(b); setVoters(c); setTally(d); }).catch((x) => setErr(x.message));
  useEffect(() => { load(); }, [id]);
  const voting = e?.positions.some((p) => p.status === 'open');
  useEffect(() => { // live refresh of the counts while any seat is open
    if (!voting) return;
    const t = setInterval(() => api(`/admin/elections/${id}/tally`).then(setTally).catch(() => {}), 10000);
    return () => clearInterval(t);
  }, [voting, id]);
  if (!e) return err ? <Err msg={err} /> : <Loading text="Loading election..." />;

  const link = `${location.origin}/apply/${e.applyCode}`;
  const upcoming = e.status === 'upcoming';
  const run = (key, fn) => async () => { setWorking(key); setErr(''); setMsg(''); try { await fn(); await load(); } catch (x) { setErr(x.message); } setWorking(''); };
  const toggle = run('link', () => api(`/admin/elections/${id}/candidate-link`, { method: 'POST', body: { open: !e.candidatesOpen } }));
  const decide = (c, status) => run(`${c.id}:${status}`, () => api(`/admin/candidates/${c.id}`, { method: 'PATCH', body: { status, note: status === 'rejected' ? prompt('Reason for rejecting (shown to the applicant):') || '' : '' } }));
  const del = run('delete', async () => { if (!confirm('Delete this election and all its seats? This cannot be undone.')) return; await api(`/admin/elections/${id}`, { method: 'DELETE' }); go('/admin'); });
  const delSeat = (p) => run(`seat:${p.id}`, async () => { if (confirm(`Delete the seat "${p.title}" and its applications?`)) await api(`/admin/positions/${p.id}`, { method: 'DELETE' }); });
  const saveBasics = async (body) => { await api(`/admin/elections/${id}`, { method: 'PUT', body }); await load(); setEditing(false); setMsg('Election updated.'); };
  const saveSeat = (pid) => async (body) => { await api(`/admin/positions/${pid}`, { method: 'PUT', body }); await load(); setEditSeat(''); setMsg('Seat updated.'); };
  const addSeat = async (body) => { await api(`/admin/elections/${id}/positions`, { method: 'POST', body }); await load(); setAdding(false); setMsg('Seat added.'); };
  const copy = async () => { await navigator.clipboard.writeText(link); setMsg('Link copied. Share it with people who want to stand.'); };
  const lastEnd = e.positions.at(-1)?.voteEnd || e.regEnd;
  const seatInit = (p) => ({ title: p.title, eligible: p.eligible, voteStart: toLocal(p.voteStart), voteEnd: toLocal(p.voteEnd) });

  return (
    <>
      <Link to="/admin" className="text-sm font-bold text-brand">Back to admin</Link>
      <div className="flex flex-wrap items-start justify-between gap-2"><h1 className="text-3xl font-extrabold text-white">{e.title}</h1><Badge s={e.status} /></div>
      <Phases e={e} status={e.status} />
      <Err msg={err} /><Ok msg={msg} />

      <div className="flex flex-wrap gap-2">
        <button className="btn-alt" onClick={() => setEditing(!editing)}>{editing ? 'Cancel editing' : 'Edit election'}</button>
        {upcoming && <Btn className="btn-alt text-bad" busy={working === 'delete'} onClick={del}>{working === 'delete' ? 'Deleting...' : 'Delete election'}</Btn>}
      </div>
      {editing && <BasicsForm e={e} onSave={saveBasics} />}

      <div className="panel space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-extrabold text-white">Seats in voting order</h2><p className="text-xs text-soft">Seats vote one after another. {upcoming ? 'You can add, edit and delete seats until voter registration opens.' : 'Seats are locked because voter registration has opened.'}</p></div>
          {upcoming && !adding && <button className="btn-alt" onClick={() => setAdding(true)}>Add a seat</button>}</div>
        {e.positions.map((p, i) => (
          <div key={p.id} className="space-y-2 border-t border-line pt-3 first:border-0 first:pt-0">
            {editSeat === p.id ? <SeatForm initial={seatInit(p)} label="Save seat" onSubmit={saveSeat(p.id)} onCancel={() => setEditSeat('')} /> : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><p className="font-bold text-white">Step {i + 1}: {p.title} {tag(p.eligible)}</p><p className="text-xs text-soft">{fmt(p.voteStart)} to {fmt(p.voteEnd)}. {SEAT[p.status]}</p></div>
                {upcoming && <div className="flex gap-2"><button className="btn-alt" onClick={() => setEditSeat(p.id)}>Edit</button><Btn className="btn-alt text-bad" busy={working === `seat:${p.id}`} disabled={!!working} onClick={delSeat(p)}>{working === `seat:${p.id}` ? 'Deleting...' : 'Delete'}</Btn></div>}
              </div>
            )}
          </div>
        ))}
        {adding && <SeatForm initial={{ title: '', eligible: 'any', voteStart: toLocal(new Date(new Date(lastEnd).getTime() + 15 * 60000)), voteEnd: toLocal(new Date(new Date(lastEnd).getTime() + 75 * 60000)) }} label="Add seat" onSubmit={addSeat} onCancel={() => setAdding(false)} />}
      </div>

      <div className="panel space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="text-lg font-extrabold text-white">Candidate application link</h2><p className="text-sm text-soft">Anyone with a verified work email and a completed profile can apply for a seat they are eligible for while the link is open.</p></div>
          <Btn className={e.candidatesOpen ? 'btn-alt' : 'btn'} busy={working === 'link'} onClick={toggle}>{working === 'link' ? 'Updating...' : e.candidatesOpen ? 'Close applications' : 'Open applications'}</Btn>
        </div>
        <div className="flex gap-2"><input readOnly className="input font-mono text-xs" value={link} aria-label="Application link" /><button className="btn-alt" onClick={copy}>Copy</button></div>
        <p className="text-xs text-soft">Status: <b className={e.candidatesOpen ? 'text-good' : 'text-soft'}>{e.candidatesOpen ? 'open' : 'closed'}</b>. Applications for each seat stop automatically when that seat's voting starts.</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-white">Candidate applications</h2>
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

      <div className="panel space-y-3">
        <h2 className="text-lg font-extrabold text-white">Registered voters ({voters.length})</h2>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead className="text-xs text-soft"><tr><th className="py-2 pr-3">Voter</th><th className="pr-3">Employee ID</th><th className="pr-3">Department</th><th className="pr-3">Gender</th><th className="pr-3">Phone</th><th>Seats voted</th></tr></thead>
          <tbody>{voters.map((v) => (
            <tr key={v.email} className="border-t border-line"><td className="py-2 pr-3"><span className="flex items-center gap-2"><Avatar src={v.photoUrl} name={v.name} size={32} /><span><b className="block text-white">{v.name}</b><span className="text-xs text-soft">{v.email}</span></span></span></td>
              <td className="pr-3">{v.employeeId}</td><td className="pr-3">{v.department}</td><td className="pr-3 capitalize">{v.gender}</td><td className="pr-3">{v.phone}</td><td className={v.voted ? 'font-bold text-good' : 'text-soft'}>{v.voted} of {v.seats}</td></tr>
          ))}</tbody></table></div>
        <p className="text-xs text-soft">Admins can see which seats a person voted in, never who they voted for.</p>
      </div>
    </>
  );
}
