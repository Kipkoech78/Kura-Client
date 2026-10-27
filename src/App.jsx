import React, { useEffect, useState, createContext, useContext } from 'react';
import { Routes, Route, NavLink, Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { api, fmt, sha256, getReceipts, saveReceipt } from './api.js';
import { Err, Ok, Badge, Avatar, PhotoUpload, Phases, Spinner, Loading, Btn, useBusy } from './ui.jsx';
import Admin, { AdminElection } from './Admin.jsx';

const Auth = createContext();
export const useAuth = () => useContext(Auth);
const nav = ({ isActive }) => `rounded-lg px-3 py-1.5 ${isActive ? 'bg-raise text-white' : 'text-soft hover:text-white'}`;

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem('token')) return setReady(true);
    api('/me').then(setUser).catch(() => localStorage.removeItem('token')).finally(() => setReady(true));
  }, []);
  const logout = () => { localStorage.removeItem('token'); setUser(null); };
  if (!ready) return <Loading text="Starting up..." />;
  return (
    <Auth.Provider value={{ user, setUser }}>
      <header className="sticky top-0 z-10 border-b border-line bg-night/90 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-1 p-3 text-sm font-bold">
          <Link to="/" className="mr-auto text-lg font-extrabold text-white">Company Vote</Link>
          <NavLink to="/" end className={nav}>Elections</NavLink>
          {user && <NavLink to="/my-votes" className={nav}>My votes</NavLink>}
          <NavLink to="/audit" className={nav}>Audit log</NavLink>
          {user?.role === 'admin' && <NavLink to="/admin" className={nav}>Admin</NavLink>}
          {user ? (<>
            <NavLink to="/profile" className="ml-2 flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-raise"><Avatar src={user.photoUrl} name={user.name} size={28} />{user.name.split(' ')[0]}</NavLink>
            <button onClick={logout} className="px-2 text-soft hover:text-white">Log out</button>
          </>) : <NavLink to="/login" className="btn ml-2">Log in</NavLink>}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl space-y-5 p-4 pb-16">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/election/:id" element={<Election />} />
          <Route path="/apply/:code" element={<Apply />} />
          <Route path="/my-votes" element={user ? <MyVotes /> : <Navigate to="/login" />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/admin" element={user?.role === 'admin' ? <Admin /> : <Navigate to="/login" />} />
          <Route path="/admin/:id" element={user?.role === 'admin' ? <AdminElection /> : <Navigate to="/login" />} />
        </Routes>
      </main>
    </Auth.Provider>
  );
}

function Home() {
  const [list, setList] = useState(null);
  useEffect(() => { api('/elections').then(setList); }, []);
  return (
    <>
      <div><h1 className="text-3xl font-extrabold text-white">Elections</h1><p className="text-soft">Register, vote, and verify your ballot. Results appear only after voting closes.</p></div>
      {!list && <Loading text="Loading elections..." />}
      {list && !list.length && <div className="panel text-soft">No elections yet. An admin will schedule one soon.</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        {list?.map((e) => (
          <Link key={e._id} to={`/election/${e._id}`} className="panel space-y-3 transition hover:border-brand">
            <div className="flex items-start justify-between gap-2"><h2 className="text-lg font-extrabold text-white">{e.title}</h2><Badge s={e.status} /></div>
            <p className="line-clamp-2 text-sm text-soft">{e.description}</p>
            <p className="text-xs text-soft">Voting: {fmt(e.voteStart)} to {fmt(e.voteEnd)}</p>
          </Link>
        ))}
      </div>
    </>
  );
}

function Login() {
  const { setUser } = useAuth();
  const go = useNavigate();
  const [f, setF] = useState({ email: '', name: '', code: '' });
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const [busy, run] = useBusy();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const send = (e) => { e.preventDefault(); setErr(''); return run(async () => { try { await api('/auth/request-code', { method: 'POST', body: f }); setSent(true); } catch (x) { setErr(x.message); } }); };
  const verify = (e) => {
    e.preventDefault(); setErr('');
    return run(async () => {
    try {
      const d = await api('/auth/verify', { method: 'POST', body: f });
      localStorage.setItem('token', d.token); setUser(d.user);
      go(new URLSearchParams(location.search).get('next') || (d.user.profileComplete ? '/' : '/profile'));
    } catch (x) { setErr(x.message); }
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

function Profile() {
  const { user, setUser } = useAuth();
  const [f, setF] = useState({ name: user.name, phone: user.phone, employeeId: user.employeeId, department: user.department, photoUrl: user.photoUrl });
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const [busy, run] = useBusy();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = (e) => {
    e.preventDefault(); setErr(''); setMsg('');
    return run(async () => { try { setUser(await api('/me/profile', { method: 'PUT', body: f })); setMsg('Profile saved. You can now register to vote or apply as a candidate.'); } catch (x) { setErr(x.message); } });
  };
  const field = (k, label, props = {}) => <div><label className="label" htmlFor={k}>{label}</label><input id={k} className="input" required value={f[k]} onChange={set(k)} {...props} /></div>;
  return (
    <form onSubmit={save} className="panel mx-auto max-w-xl space-y-4">
      <div><h1 className="text-2xl font-extrabold text-white">Your voter profile</h1><p className="text-sm text-soft">Fill this in once. It is used for every election, so registering later takes one click.</p></div>
      <PhotoUpload value={f.photoUrl} name={f.name} onChange={(photoUrl) => setF({ ...f, photoUrl })} label="Profile photo (optional for voters)" />
      <div className="grid gap-4 sm:grid-cols-2">
        {field('name', 'Full name')}
        <div><label className="label">Work email</label><input className="input opacity-60" value={user.email} disabled /></div>
        {field('phone', 'Phone number', { type: 'tel' })}
        {field('employeeId', 'Employee ID')}
      </div>
      {field('department', 'Department')}
      <Err msg={err} /><Ok msg={msg} />
      <Btn busy={busy}>{busy ? 'Saving...' : 'Save profile'}</Btn>
    </form>
  );
}

function Election() {
  const { id } = useParams();
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [pick, setPick] = useState('');
  const [receipt, setReceipt] = useState('');
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const [acting, setActing] = useState('');
  const load = () => api(`/elections/${id}`).then((x) => { setD(x); if (x.status === 'closed') api(`/elections/${id}/results`).then(setRes); }).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id, user]);
  const act = (path, body) => async () => {
    setErr(''); setActing(path);
    try { const r = await api(`/elections/${id}/${path}`, { method: 'POST', body }); if (r.receipt) { setReceipt(r.receipt); saveReceipt(id, r.receipt); } await load(); } catch (e) { setErr(e.message); } finally { setActing(''); }
  };
  if (!d) return err ? <Err msg={err} /> : <Loading text="Loading election..." />;
  const { election: e, status, me, candidates } = d;
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2"><h1 className="text-3xl font-extrabold text-white">{e.title}</h1><Badge s={status} /></div>
      <p className="max-w-3xl text-soft">{e.description}</p>
      <Phases e={e} status={status} />
      <p className="text-sm text-soft"><b className="text-white">{d.registered}</b> registered voters. <b className="text-white">{d.votes}</b> ballots cast.</p>
      <Err msg={err} />

      {status === 'registration' && (
        <div className="panel flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-extrabold text-white">Voter registration is open</h2><p className="text-sm text-soft">One click. Your details come from your profile.</p></div>
          {!user ? <Link className="btn" to={`/login?next=/election/${id}`}>Log in to register</Link>
            : me?.registered ? <span className="font-extrabold text-good">You are registered</span>
            : !me?.profileComplete ? <Link className="btn" to="/profile">Complete profile first</Link>
            : <Btn busy={acting === 'register'} onClick={act('register')}>{acting === 'register' ? 'Registering...' : 'Register to vote'}</Btn>}
        </div>
      )}

      {status === 'voting' && (
        !user ? <p><Link className="font-bold text-brand underline" to={`/login?next=/election/${id}`}>Log in</Link> to vote.</p>
        : me?.voted ? <div className="panel border-good/50"><h2 className="font-extrabold text-good">Your vote is recorded</h2><p className="text-sm text-soft">Track it under My votes.</p></div>
        : !me?.registered ? <div className="panel text-soft">You did not register before the deadline, so you cannot vote in this election.</div>
        : (
          <div className="space-y-3">
            <h2 className="text-xl font-extrabold text-white">Choose one candidate</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {candidates.map((c) => (
                <label key={c.id} className={`panel relative flex cursor-pointer gap-4 transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold ${pick === c.id ? 'border-gold bg-gold/10' : 'hover:border-brand'}`}>
                  <input type="radio" name="c" className="sr-only" checked={pick === c.id} onChange={() => setPick(c.id)} disabled={acting === 'vote'} />
                  <span aria-hidden className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border-2 ${pick === c.id ? 'border-gold bg-gold text-night' : 'border-line'}`}>
                    {pick === c.id && <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3"><path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </span>
                  <Avatar src={c.photoUrl} name={c.name} size={72} />
                  <span className="min-w-0 pr-8"><b className="block text-white">{c.name}</b><span className="text-xs text-soft">{c.department}</span><span className="mt-2 line-clamp-4 block text-sm">{c.manifesto}</span></span>
                </label>
              ))}
            </div>
            <Btn busy={acting === 'vote'} disabled={!pick} onClick={() => confirm('Cast this vote? You cannot change it.') && act('vote', { candidateId: pick })()}>{acting === 'vote' ? 'Recording your vote...' : pick ? `Cast my vote for ${candidates.find((c) => c.id === pick)?.name}` : 'Select a candidate'}</Btn>
          </div>
        )
      )}

      {receipt && <div className="panel border-gold/60"><p className="font-extrabold text-gold">Your receipt</p><p className="mt-1 break-all font-mono text-xs">{receipt}</p><p className="mt-2 text-sm text-soft">Saved on this device and emailed to you. It proves your ballot exists without showing your choice.</p></div>}

      {user && me?.registered && <Tracker id={id} registered voted={me.voted} status={status} />}

      {status !== 'closed' && candidates.length > 0 && status !== 'voting' && <Candidates list={candidates} />}
      {res && <Results res={res} />}
      <Ledger id={id} status={status} candidates={candidates} />
    </>
  );
}

function Candidates({ list }) {
  return (
    <div className="space-y-3"><h2 className="text-xl font-extrabold text-white">Approved candidates</h2>
      <div className="grid gap-3 sm:grid-cols-2">{list.map((c) => (
        <div key={c.id} className="panel flex gap-4"><Avatar src={c.photoUrl} name={c.name} size={64} /><div><b className="text-white">{c.name}</b><p className="text-xs text-soft">{c.department}</p><p className="mt-2 text-sm">{c.manifesto}</p></div></div>
      ))}</div></div>
  );
}

// Follows one ballot from registration to the final count, using only the voter's own receipt
export function Tracker({ id, registered, voted, status }) {
  const [ledger, setLedger] = useState(null);
  const [cands, setCands] = useState([]);
  const receipt = getReceipts()[id];
  useEffect(() => { api(`/elections/${id}/ledger`).then(setLedger); api(`/elections/${id}`).then((x) => setCands(x.candidates)); }, [id, voted, status]);
  const entry = receipt && ledger?.ballots.find((b) => b.hash === receipt);
  const closed = status === 'closed';
  const choice = closed && entry && cands.find((c) => c.id === entry.candidateId)?.name;
  const stages = [
    ['Registered', registered, 'You are on the voter list.'],
    ['Ballot cast', voted, voted ? 'The server marked you as voted. You cannot vote twice.' : 'Waiting for you to vote.'],
    ['Recorded in the public ledger', !!entry, entry ? `Your ballot is #${entry.index + 1} in the chain.` : voted && !receipt ? 'No receipt on this device. Check your email and paste it into the ledger search below.' : 'Appears after you vote.'],
    ['Counted in the final result', closed && !!entry && ledger.valid, closed ? (entry ? `Your ballot shows: ${choice || 'unknown'}. Chain verified: ${ledger.valid ? 'yes' : 'NO'}.` : 'Your ballot was not found.') : 'Shown when voting ends.'],
  ];
  return (
    <ol className="panel space-y-3">
      <h2 className="font-extrabold text-white">Track your vote</h2>
      {!ledger && <p className="flex items-center gap-2 text-xs text-soft"><Spinner /> Checking the public ledger...</p>}
      {stages.map(([t, ok, note]) => (
        <li key={t} className="flex gap-3"><span aria-hidden className={`mt-1 h-3 w-3 shrink-0 rounded-full ${ok ? 'bg-good' : 'bg-line'}`} /><div><p className={`text-sm font-bold ${ok ? 'text-white' : 'text-soft'}`}>{t}</p><p className="text-xs text-soft">{note}</p></div></li>
      ))}
    </ol>
  );
}

function MyVotes() {
  const [list, setList] = useState(null);
  useEffect(() => { api('/me/elections').then(setList); }, []);
  return (
    <>
      <div><h1 className="text-3xl font-extrabold text-white">My votes</h1><p className="text-soft">Follow every ballot you cast, from registration to the final count.</p></div>
      {!list && <Loading text="Loading your elections..." />}
      {list && !list.length && <div className="panel text-soft">You have not registered for any election yet. <Link to="/" className="font-bold text-brand underline">Browse elections</Link></div>}
      {list?.map((x) => (
        <div key={x.id} className="space-y-2">
          <div className="flex items-center justify-between"><Link to={`/election/${x.id}`} className="text-lg font-extrabold text-white hover:text-brand">{x.title}</Link><Badge s={x.status} /></div>
          <Tracker id={x.id} registered voted={x.voted} status={x.status} />
        </div>
      ))}
    </>
  );
}

function Results({ res }) {
  const top = res.results[0]?.votes;
  return (
    <div className="panel space-y-4">
      <div><h2 className="text-2xl font-extrabold text-white">Final results</h2><p className="text-sm text-soft">{res.total} of {res.registered} registered voters voted. Ballot chain {res.valid ? 'verified' : 'FAILED verification'}.</p></div>
      {res.results.map((c) => (
        <div key={c.id} className="flex items-center gap-3">
          <Avatar src={c.photoUrl} name={c.name} size={44} />
          <div className="flex-1"><div className="flex justify-between text-sm font-bold"><span className="text-white">{c.name}{c.votes === top && top > 0 ? ' (leading)' : ''}</span><span>{c.votes} ({res.total ? Math.round((c.votes / res.total) * 100) : 0}%)</span></div>
            <div className="mt-1 h-2 rounded bg-raise"><div className={`h-2 rounded ${c.votes === top ? 'bg-gold' : 'bg-brand'}`} style={{ width: `${res.total ? (c.votes / res.total) * 100 : 0}%` }} /></div></div>
        </div>
      ))}
    </div>
  );
}

function Ledger({ id, status, candidates }) {
  const [ledger, setLedger] = useState(null);
  const [q, setQ] = useState('');
  const [self, setSelf] = useState(null);
  useEffect(() => { api(`/elections/${id}/ledger`).then(setLedger); }, [id, status]);
  // the browser recomputes every hash itself once the election has closed
  useEffect(() => {
    if (!ledger?.closed) return;
    (async () => {
      let prev = '0'.repeat(64);
      for (const [i, b] of ledger.ballots.entries()) {
        if (b.index !== i || b.prevHash !== prev || (await sha256(`${b.index}|${b.election}|${b.candidateId}|${b.nonce}|${b.prevHash}`)) !== b.hash) return setSelf(false);
        prev = b.hash;
      }
      setSelf(true);
    })();
  }, [ledger]);
  if (!ledger) return <div className="panel"><Loading text="Loading ledger..." /></div>;
  const hit = q.trim().length === 64 ? ledger.ballots.find((b) => b.hash === q.trim().toLowerCase()) : null;
  return (
    <div className="panel space-y-3">
      <h2 className="text-xl font-extrabold text-white">Public ballot ledger</h2>
      <p className="text-sm text-soft">Each ballot is chained to the one before it, so changing or removing one breaks the chain. Server check: <b className={ledger.valid ? 'text-good' : 'text-bad'}>{ledger.valid ? 'intact' : 'BROKEN'}</b>.{ledger.closed && self !== null && <> Your browser's own recount: <b className={self ? 'text-good' : 'text-bad'}>{self ? 'intact' : 'BROKEN'}</b>.</>}</p>
      <input className="input font-mono" placeholder="Paste a receipt to find a ballot" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Receipt search" />
      {hit && <p className="text-sm font-bold text-good">Found: ballot #{hit.index + 1}{hit.candidateId && ` for ${candidates.find((c) => c.id === hit.candidateId)?.name || 'a candidate'}`}.</p>}
      {q.trim().length === 64 && !hit && <p className="text-sm font-bold text-bad">No ballot with that receipt.</p>}
      <div className="max-h-56 overflow-auto rounded-lg bg-night p-3 font-mono text-xs text-soft">
        {ledger.ballots.length ? ledger.ballots.map((b) => <p key={b.index} className="break-all py-0.5">#{b.index + 1} {b.hash}</p>) : 'No ballots yet.'}
      </div>
    </div>
  );
}

function Apply() {
  const { code } = useParams();
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [f, setF] = useState({ manifesto: '', photoUrl: '' });
  const [err, setErr] = useState('');
  const [busy, run] = useBusy();
  const load = () => api(`/apply/${code}`).then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [code, user]);
  const submit = (e) => { e.preventDefault(); setErr(''); return run(async () => { try { await api(`/apply/${code}`, { method: 'POST', body: f }); await load(); } catch (x) { setErr(x.message); } }); };
  if (!d) return err ? <Err msg={err} /> : <Loading text="Loading application..." />;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div><p className="text-sm font-bold text-gold">Candidate application</p><h1 className="text-3xl font-extrabold text-white">{d.title}</h1><p className="text-soft">{d.description}</p></div>
      {!d.open ? <div className="panel text-soft">Applications for this election are closed.</div>
        : !user ? <div className="panel space-y-3"><p>Log in with your work email to apply.</p><Link className="btn" to={`/login?next=/apply/${code}`}>Log in</Link></div>
        : d.mine ? <div className="panel"><p className="font-extrabold text-white">Application {d.mine.status}</p><p className="text-sm text-soft">{d.mine.status === 'pending' ? 'An admin is reviewing it. Check back here.' : d.mine.status === 'approved' ? 'You are on the ballot.' : `Not approved. ${d.mine.note}`}</p></div>
        : !d.profileComplete ? <div className="panel space-y-3"><p>Complete your profile first. Your details are shown to voters next to your name.</p><Link className="btn" to="/profile">Complete profile</Link></div>
        : (
          <form onSubmit={submit} className="panel space-y-4">
            <div className="flex items-center gap-3"><Avatar src={user.photoUrl} name={user.name} size={48} /><div><b className="text-white">{user.name}</b><p className="text-xs text-soft">{user.department}, ID {user.employeeId}</p></div></div>
            <div><label className="label" htmlFor="m">Why should colleagues vote for you?</label><textarea id="m" className="input" rows={6} required minLength={20} maxLength={1500} value={f.manifesto} onChange={(e) => setF({ ...f, manifesto: e.target.value })} /></div>
            <PhotoUpload value={f.photoUrl} name={user.name} label={user.photoUrl ? "Campaign photo (optional, defaults to your profile photo)" : "Candidate photo (required to appear on the ballot)"} onChange={(photoUrl) => setF({ ...f, photoUrl })} />
            <Err msg={err} /><Btn busy={busy} disabled={!user.photoUrl && !f.photoUrl}>{busy ? 'Submitting...' : 'Submit application'}</Btn>
          </form>
        )}
      {d.open && user && !d.mine && err && null}
    </div>
  );
}

function Audit() {
  const [a, setA] = useState(null);
  useEffect(() => { api('/audit').then(setA); }, []);
  if (!a) return <Loading text="Loading audit log..." />;
  return (
    <div className="panel space-y-3">
      <div><h1 className="text-2xl font-extrabold text-white">Admin audit log</h1><p className="text-sm text-soft">Every admin action is recorded in a hash chain. Status: <b className={a.valid ? 'text-good' : 'text-bad'}>{a.valid ? 'intact' : 'TAMPERED'}</b>.</p></div>
      {!a.logs.length && <p className="text-soft">No admin actions yet.</p>}
      {a.logs.map((l) => <p key={l.hash} className="border-t border-line pt-2 text-sm"><b className="text-white">{l.action}</b> by {l.actor}: {l.detail}<br /><span className="text-xs text-soft">{fmt(l.at)}</span></p>)}
    </div>
  );
}
