import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, fmt } from '../api.js';
import { Err, Ok, Badge, Loading, Btn, useBusy } from '../ui.jsx';
import { SEAT } from '../shared.jsx';
import { iso, toLocal, tag, PageHeader } from './helpers.jsx';

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

export default function EditElection() {
  const { id } = useParams();
  const [e, setE] = useState(null);
  const [editSeat, setEditSeat] = useState('');
  const [adding, setAdding] = useState(false);
  const [working, setWorking] = useState('');
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const load = () => api(`/admin/elections/${id}`).then(setE).catch((x) => setErr(x.message));
  useEffect(() => { load(); }, [id]);
  if (!e) return err ? <Err msg={err} /> : <Loading text="Loading election..." />;

  const upcoming = e.status === 'upcoming';
  const run = (key, fn) => async () => { setWorking(key); setErr(''); setMsg(''); try { await fn(); await load(); } catch (x) { setErr(x.message); } setWorking(''); };
  const delSeat = (p) => run(`seat:${p.id}`, async () => { if (confirm(`Delete the seat "${p.title}" and its applications?`)) await api(`/admin/positions/${p.id}`, { method: 'DELETE' }); });
  const saveBasics = async (body) => { await api(`/admin/elections/${id}`, { method: 'PUT', body }); await load(); setMsg('Election updated.'); };
  const saveSeat = (pid) => async (body) => { await api(`/admin/positions/${pid}`, { method: 'PUT', body }); await load(); setEditSeat(''); setMsg('Seat updated.'); };
  const addSeat = async (body) => { await api(`/admin/elections/${id}/positions`, { method: 'POST', body }); await load(); setAdding(false); setMsg('Seat added.'); };
  const lastEnd = e.positions.at(-1)?.voteEnd || e.regEnd;
  const seatInit = (p) => ({ title: p.title, eligible: p.eligible, voteStart: toLocal(p.voteStart), voteEnd: toLocal(p.voteEnd) });

  return (
    <>
      <Link to={`/admin/elections/${id}`} className="text-sm font-bold text-brand">Back to election</Link>
      <PageHeader title={`Edit: ${e.title}`}><Badge s={e.status} /></PageHeader>
      <Err msg={err} /><Ok msg={msg} />
      <BasicsForm e={e} onSave={saveBasics} />

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
    </>
  );
}
