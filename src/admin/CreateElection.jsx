import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Err, Btn, useBusy } from '../ui.jsx';
import { iso, PageHeader, PRESETS, seat, blank } from './helpers.jsx';

export default function CreateElection() {
  const go = useNavigate();
  const [f, setF] = useState(blank);
  const [err, setErr] = useState('');
  const [busy, run] = useBusy();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setSeat = (i, k, v) => setF({ ...f, positions: f.positions.map((p, j) => (j === i ? { ...p, [k]: v } : p)) });
  const move = (i, d) => { const ps = [...f.positions]; const j = i + d; if (j < 0 || j >= ps.length) return; [ps[i], ps[j]] = [ps[j], ps[i]]; setF({ ...f, positions: ps }); };
  const submit = (e) => {
    e.preventDefault(); setErr('');
    return run(async () => {
      try { await api('/admin/elections', { method: 'POST', body: { ...f, regStart: iso(f.regStart), regEnd: iso(f.regEnd), voteStart: iso(f.voteStart), voteEnd: iso(f.voteEnd) } }); go("/admin/elections"); }
      catch (x) { setErr(x.message); }
    });
  };
  const dt = (k, text) => <div><label className="label" htmlFor={k}>{text}</label><input id={k} className="input" type="datetime-local" required value={f[k]} onChange={set(k)} /></div>;
  return (
    <>
    <PageHeader title="Create election" sub="Set up the election, its seats and the voting window." />
    <form onSubmit={submit} className="panel space-y-4">
      <div><label className="label" htmlFor="t">Title</label><input id="t" className="input" required value={f.title} onChange={set('title')} placeholder="Student Union Elections 2027" /></div>
      <div><label className="label" htmlFor="d">Description</label><textarea id="d" className="input" rows={2} value={f.description} onChange={set('description')} /></div>
      <div className="grid gap-4 sm:grid-cols-2">{dt('regStart', 'Voter registration opens')}{dt('regEnd', 'Voter registration closes')}</div>

      <div className="space-y-3 rounded-xl border border-line p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-extrabold text-white">Ballot seats</h3><p className="text-xs text-soft">Voters can move between seats, revise choices, and submit all eligible choices together before voting closes.</p></div>
          <div className="flex flex-wrap gap-2">{Object.entries(PRESETS).map(([n, ps]) => <button type="button" key={n} className="btn-alt" onClick={() => setF({ ...f, positions: ps.map(seat) })}>{n} example</button>)}</div></div>
        {f.positions.map((p, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <span className="w-6 text-center text-sm font-bold text-soft">{i + 1}</span>
            <input className="input min-w-0 flex-1" aria-label={`Seat ${i + 1} title`} placeholder="e.g. Head of ICT" value={p.title} onChange={(e) => setSeat(i, 'title', e.target.value)} />
            <select className="input w-full sm:w-36" aria-label={`Seat ${i + 1} eligibility`} value={p.eligible} onChange={(e) => setSeat(i, 'eligible', e.target.value)}><option value="any">Everyone</option><option value="female">Female only</option><option value="male">Male only</option></select>
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
    </>
  );
}
