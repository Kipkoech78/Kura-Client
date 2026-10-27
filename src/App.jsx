import React, { useEffect, useState, createContext, useContext } from 'react';
import { Routes, Route, NavLink, Link, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
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
          {/* <NavLink to="/audit" className={nav}>Audit log</NavLink> */}
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
            <p className="text-xs text-soft">{e.seats} {e.seats === 1 ? 'seat' : 'seats'}. Voting: {fmt(e.voteStart)} to {fmt(e.voteEnd)}</p>
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
  e.preventDefault();
  setErr('');

  return run(async () => {
    try {
      const d = await api('/auth/verify', {
        method: 'POST',
        body: f
      });

      localStorage.setItem('token', d.token);
      setUser(d.user);

      const params = new URLSearchParams(location.search);
      const next = params.get('next') || '/';

      if (!d.user.profileComplete) {
        go(`/profile?next=${encodeURIComponent(next)}`, {
          replace: true
        });
      } else {
        go(next, { replace: true });
      }
    } catch (x) {
      setErr(x.message);
    }
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
  const navigate = useNavigate();
const location = useLocation();

const params = new URLSearchParams(location.search);
const next = params.get('next') || '/';

  const [f, setF] = useState({
    name: user.name,
    phone: user.phone,
    employeeId: user.employeeId,
    department: user.department,
    gender: user.gender || '',
    photoUrl: user.photoUrl
  });

  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, run] = useBusy();

  const set = (k) => (e) =>
    setF({ ...f, [k]: e.target.value });

  
const save = (e) => {
  e.preventDefault();
  setErr('');
  setMsg('');

  return run(async () => {
    try {
      const updatedUser = await api('/me/profile', {
        method: 'PUT',
        body: f
      });

      setUser(updatedUser);

      // Return to the original destination after saving the profile.
      navigate(next, { replace: true });
    } catch (x) {
      setErr(x.message);
    }
  });
};


  const field = (k, label, props = {}) => (
    <div>
      <label className="label" htmlFor={k}>{label}</label>
      <input
        id={k}
        className="input"
        required
        value={f[k]}
        onChange={set(k)}
        {...props}
      />
    </div>
  );

  return (
    <form onSubmit={save} className="panel mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-white">
          Your voter profile
        </h1>
        <p className="text-sm text-soft">
          Fill this in once. It is used for every election, so registering later takes one click.
        </p>
      </div>

      <PhotoUpload
        value={f.photoUrl}
        name={f.name}
        onChange={(photoUrl) => setF({ ...f, photoUrl })}
        label="Profile photo (optional for voters)"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {field('name', 'Full name')}

        <div>
          <label className="label">Work email</label>
          <input className="input opacity-60" value={user.email} disabled />
        </div>

        {field('phone', 'Phone number', { type: 'tel' })}
        {field('employeeId', 'Employee ID')}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {field('department', 'Department')}

        <div>
          <label className="label" htmlFor="gender">Gender</label>
          <select
            id="gender"
            className="input"
            required
            value={f.gender}
            onChange={set('gender')}
          >
            <option value="">Select</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other / prefer not to say</option>
          </select>

          <p className="mt-1 text-xs text-soft">
            Used only for gender-specific seats, such as hostel captains.
          </p>
        </div>
      </div>

      <Err msg={err} />
      <Ok msg={msg} />

      <Btn busy={busy}>
        {busy ? 'Saving...' : 'Save profile'}
      </Btn>
    </form>
  );
}

const SEAT = { upcoming: 'Scheduled', open: 'Voting open', closed: 'Closed' };
const forWho = (el) => (el === 'any' ? null : <span className="rounded-full border border-gold/50 px-2 py-0.5 text-xs font-bold text-gold">{el === 'female' ? 'Female only' : 'Male only'}</span>);
const canJoin = (p, gender) => p.eligible === 'any' || p.eligible === gender;

function Election() {
  const { id } = useParams();
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const [acting, setActing] = useState('');
  const [draft, setDraft] = useState({});
  const [reviewing, setReviewing] = useState(false);
  const [receipts, setReceipts] = useState({});
  const load = () => api(`/elections/${id}`).then((x) => { setD(x); if (x.status === 'closed') api(`/elections/${id}/results`).then(setRes); }).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id, user]);
  const act = async (key, path, body) => {
    setErr(''); setActing(key);
    try { const r = await api(path, { method: 'POST', body }); await load(); return r; } catch (e) { setErr(e.message); return null; } finally { setActing(''); }
  };
  if (!d) return err ? <Err msg={err} /> : <Loading text="Loading election..." />;
  const { election: e, status, me, positions } = d;
  const closed = status === 'closed';
  const voting = status === 'voting';
  const ballotPositions = positions.filter((p) => me?.registered && canJoin(p, me.gender) && p.candidates.length > 0 && !me?.voted?.[p.id]);
  const alreadySubmitted = !!me?.registered && ballotPositions.length === 0 && positions.some((p) => me?.voted?.[p.id]);
  const incomplete = ballotPositions.filter((p) => !draft[p.id]);
  const submitBallot = async () => {
    if (incomplete.length) { setErr(`Choose a candidate or abstain for: ${incomplete.map((p) => p.title).join(', ')}`); setReviewing(false); return; }
    if (!confirm('Submit your complete ballot now? You will not be able to change your choices after submission.')) return;
    const result = await act('ballot', `/elections/${id}/ballot`, {
      choices: ballotPositions.map((p) => ({ positionId: p.id, candidateId: draft[p.id] })),
    });
    if (result?.receipts) {
      setReceipts(result.receipts);
      Object.entries(result.receipts).forEach(([pid, hash]) => saveReceipt(pid, hash));
      setDraft({});
      setReviewing(false);
    }
  };
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2"><h1 className="text-3xl font-extrabold text-white">{e.title}</h1><Badge s={status} /></div>
      <p className="max-w-3xl text-soft">{e.description}</p>
      <Phases e={e} status={status} />
      <p className="text-sm text-soft"><b className="text-white">{d.registered}</b> registered voters. <b className="text-white">{positions.length}</b> seats.</p>
      <Err msg={err} />

      {status === 'registration' && (
        <div className="panel flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-extrabold text-white">Voter registration is open</h2><p className="text-sm text-soft">One click registers you for every seat you are eligible for.</p></div>
          {!user ? <Link className="btn" to={`/login?next=/election/${id}`}>Log in to register</Link>
            : me?.registered ? <span className="font-extrabold text-good">You are registered</span>
            : !me?.profileComplete ? <Link className="btn" to="/profile">Complete profile first</Link>
            : <Btn busy={acting === 'register'} onClick={() => act('register', `/elections/${id}/register`)}>{acting === 'register' ? 'Registering...' : 'Register to vote'}</Btn>}
        </div>
      )}

      <div>
        <h2 className="text-2xl font-extrabold text-white">{voting ? 'Your ballot' : 'Election seats'}</h2>
        <p className="text-sm text-soft">{voting
          ? 'Move freely between seats, revise any draft choice, then review and submit your ballot once. Draft choices are not recorded until submission.'
          : 'All seats share the election-wide voting window. Results for every seat are published when the election ends.'}</p>
      </div>

      {voting && !user && <div className="panel"><Link className="font-bold text-brand underline" to={`/login?next=${encodeURIComponent(location.pathname)}`}>Log in</Link> to vote.</div>}
      {voting && user && !me?.registered && <div className="panel text-soft">You did not register before the deadline, so you cannot vote in this election.</div>}
      {voting && user && me?.registered && ballotPositions.length > 0 && (
        <div className="panel space-y-3">
          <div className="flex items-center justify-between gap-3"><b className="text-white">Ballot progress</b><span className="text-sm text-soft">{ballotPositions.filter((p) => !!draft[p.id]).length} of {ballotPositions.length} selected</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-raise"><div className="h-full rounded-full bg-gold transition-all" style={{ width: `${ballotPositions.length ? ballotPositions.filter((p) => !!draft[p.id]).length / ballotPositions.length * 100 : 0}%` }} /></div>
          <div className="flex flex-wrap gap-2">{ballotPositions.map((p, i) => <a key={p.id} href={`#seat-${p.id}`} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${draft[p.id] ? 'border-good text-good' : 'border-line text-soft'}`}>{i + 1}. {p.title}{draft[p.id] ? ' ✓' : ''}</a>)}</div>
        </div>
      )}
      {alreadySubmitted && voting && <div className="panel text-good font-bold">Your eligible votes have already been recorded.</div>}
      {positions.map((p, i) => <Seat key={p.id} p={p} step={i + 1} user={user} me={me} closed={closed} voting={voting} acting={acting} pick={draft[p.id] || ''} setPick={(value) => setDraft((old) => ({ ...old, [p.id]: value }))} receipt={receipts[p.id] || ''} />)}

      {voting && user && me?.registered && ballotPositions.length > 0 && (
        <div className="panel space-y-3">
          <h2 className="text-xl font-extrabold text-white">Finish your ballot</h2>
          <p className="text-sm text-soft">You can continue editing choices above. Nothing is submitted until you confirm the final review.</p>
          <Btn disabled={incomplete.length > 0} onClick={() => setReviewing(true)}>Review and submit ballot ({ballotPositions.length} seats)</Btn>
          {incomplete.length > 0 && <p className="text-xs text-gold">Still to select: {incomplete.map((p) => p.title).join(', ')}</p>}
        </div>
      )}

      {reviewing && (
        <div className="panel space-y-4 border-gold">
          <h2 className="text-2xl font-extrabold text-white">Review your ballot</h2>
          <p className="text-sm text-soft">Check every selection. Use “Back to choices” if you want to make changes.</p>
          <div className="divide-y divide-line">
            {ballotPositions.map((p) => {
              const choice = draft[p.id];
              const candidate = p.candidates.find((c) => c.id === choice);
              return <div key={p.id} className="flex items-center justify-between gap-3 py-3"><div><b className="text-white">{p.title}</b><p className="text-sm text-soft">{choice === 'abstain' ? 'Abstain' : candidate?.name || 'No selection'}</p></div><button className="btn-alt" onClick={() => { setReviewing(false); document.getElementById(`seat-${p.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>Edit</button></div>;
            })}
          </div>
          <div className="flex flex-wrap gap-2"><button className="btn-alt" onClick={() => setReviewing(false)}>Back to choices</button><Btn busy={acting === 'ballot'} onClick={submitBallot}>{acting === 'ballot' ? 'Submitting ballot...' : 'Confirm and submit ballot'}</Btn></div>
        </div>
      )}
      {closed && !res && <Loading text="Loading results..." />}
      {res && <Results res={res} />}
    </>
  );
}

function Seat({ p, step, user, me, closed, voting, acting, pick, setPick, receipt }) {
  const [showLedger, setShowLedger] = useState(false);
  const mine = me && canJoin(p, me.gender);
  const voted = !!me?.voted?.[p.id];
  const busy = acting === 'ballot';
  const selectable = voting && user && me?.registered && mine && !voted && p.candidates.length > 0;
  return (
    <section id={`seat-${p.id}`} className={`panel space-y-4 scroll-mt-24 ${selectable ? 'border-gold' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><p className="text-xs font-bold tracking-wide text-soft">SEAT {step}</p><h2 className="text-xl font-extrabold text-white">{p.title}</h2></div>
        <div className="flex items-center gap-2">{forWho(p.eligible)}<span className={`rounded-full px-3 py-1 text-xs font-bold ${selectable ? 'bg-gold text-night' : 'bg-raise text-soft'}`}>{closed ? 'Closed' : voting ? (selectable ? 'Choose your vote' : voted ? 'Vote recorded' : 'Voting open') : SEAT[p.status]}</span></div>
      </div>

      {voting && (
        !user ? <p><Link className="font-bold text-brand underline" to={`/login?next=${encodeURIComponent(location.pathname)}`}>Log in</Link> to vote.</p>
        : !me?.registered ? <p className="text-soft">You did not register before the deadline, so you cannot vote in this election.</p>
        : !mine ? <p className="text-soft">This seat is for {p.eligible} voters only.</p>
        : voted ? <p className="font-extrabold text-good">Your vote for this seat is already recorded and cannot be changed.</p>
        : p.candidates.length < 1 ? <p className="text-soft">There are no approved candidates for this seat, so no vote will be held.</p>
        : (
          <div className="space-y-3">
            <h3 className="font-extrabold text-white">Choose one candidate</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {p.candidates.map((c) => (
                <label key={c.id} className={`panel relative flex cursor-pointer gap-4 transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold ${pick === c.id ? 'border-gold bg-gold/10' : 'hover:border-brand'}`}>
                  <input type="radio" name={`c-${p.id}`} className="sr-only" checked={pick === c.id} onChange={() => setPick(c.id)} disabled={busy} />
                  <span aria-hidden className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border-2 ${pick === c.id ? 'border-gold bg-gold text-night' : 'border-line'}`}>{pick === c.id && '✓'}</span>
                  <Avatar src={c.photoUrl} name={c.name} size={72} />
                  <span className="min-w-0 pr-8"><b className="block text-white">{c.name}</b><span className="text-xs text-soft">{c.department}</span><span className="mt-2 line-clamp-4 block text-sm">{c.manifesto}</span></span>
                </label>
              ))}
            </div>
            <label className={`panel relative flex cursor-pointer items-center gap-4 transition ${pick === 'abstain' ? 'border-gold bg-gold/10' : 'hover:border-brand'}`}>
              <input type="radio" name={`c-${p.id}`} className="sr-only" checked={pick === 'abstain'} onChange={() => setPick('abstain')} disabled={busy} />
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${pick === 'abstain' ? 'border-gold bg-gold text-night' : 'border-line'}`}>{pick === 'abstain' && '✓'}</span>
              <span><b className="block text-white">Abstain</b><span className="text-sm text-soft">Record a ballot for this seat without supporting a candidate.</span></span>
            </label>
            {pick && <p className="text-xs font-bold text-good">Draft saved in this page only — not submitted yet.</p>}
          </div>
        )
      )}

      {!voting && !closed && p.candidates.length > 0 && <Candidates list={p.candidates} />}
      {p.status === 'upcoming' && p.candidates.length === 0 && !closed && <p className="text-sm text-soft">Candidates appear here once the admin approves applications.</p>}
      {receipt && <div className="rounded-xl border border-gold/60 p-4"><p className="font-extrabold text-gold">Your receipt for {p.title}</p><p className="mt-1 break-all font-mono text-xs">{receipt}</p><p className="mt-2 text-sm text-soft">It proves your ballot exists without showing your choice.</p></div>}
      {user && me?.registered && mine && <Tracker pid={p.id} voted={voted} closed={closed} cands={p.candidates} />}
      <details onToggle={(e) => setShowLedger(e.currentTarget.open)}>
        <summary className="cursor-pointer text-sm font-bold text-brand">Public ballot ledger for this seat</summary>
        {showLedger && <div className="mt-3"><Ledger pid={p.id} candidates={p.candidates} /></div>}
      </details>
    </section>
  );
}

function Candidates({ list }) {
  return (
    <div className="space-y-2"><h3 className="font-extrabold text-white">Approved candidates</h3>
      <div className="grid gap-3 sm:grid-cols-2">{list.map((c) => (
        <div key={c.id} className="flex gap-4 rounded-xl border border-line bg-night/40 p-4"><Avatar src={c.photoUrl} name={c.name} size={56} /><div><b className="text-white">{c.name}</b><p className="text-xs text-soft">{c.department}</p><p className="mt-2 text-sm">{c.manifesto}</p></div></div>
      ))}</div></div>
  );
}

// Follows one ballot (one seat) from casting to the final count, using only the voter's own receipt
function Tracker({ pid, voted, closed, cands }) {
  const [ledger, setLedger] = useState(null);
  const receipt = getReceipts()[pid];
  useEffect(() => { api(`/positions/${pid}/ledger`).then(setLedger); }, [pid, voted, closed]);
  const entry = receipt && ledger?.ballots.find((b) => b.hash === receipt);
  const choice = closed && entry && (entry.candidateId === 'abstain' ? 'Abstained' : cands.find((c) => c.id === entry.candidateId)?.name);
  const stages = [
    ['Ballot cast', voted, voted ? 'The server marked you as voted for this seat. You cannot vote twice.' : 'Waiting for you to vote.'],
    ['Recorded in the public ledger', !!entry, entry ? `Your ballot is #${entry.index + 1} in this seat's chain.` : voted && !receipt ? 'No receipt on this device. Check your email and paste it into the ledger search.' : 'Appears after you vote.'],
    ['Counted in the final result', closed && !!entry && ledger.valid, closed ? (entry ? `Your ballot shows: ${choice || 'unknown'}. Chain verified: ${ledger.valid ? 'yes' : 'NO'}.` : 'Your ballot was not found.') : 'Shown when the election ends.'],
  ];
  return (
    <ol className="space-y-2 rounded-xl border border-line bg-night/40 p-4">
      <h3 className="font-extrabold text-white">Track your vote</h3>
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
      <div><h1 className="text-3xl font-extrabold text-white">My votes</h1><p className="text-soft">Follow every ballot you cast, seat by seat, from voting to the final count.</p></div>
      {!list && <Loading text="Loading your elections..." />}
      {list && !list.length && <div className="panel text-soft">You have not registered for any election yet. <Link to="/" className="font-bold text-brand underline">Browse elections</Link></div>}
      {list?.map((x) => <MyElection key={x.id} x={x} />)}
    </>
  );
}

function MyElection({ x }) {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  useEffect(() => { api(`/elections/${x.id}`).then(setD); }, [x.id]);
  const seats = d?.positions.filter((p) => canJoin(p, user.gender)) || [];
  return (
    <div className="panel space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><Link to={`/election/${x.id}`} className="text-lg font-extrabold text-white hover:text-brand">{x.title}</Link><Badge s={x.status} /></div>
      <p className="text-sm text-soft">Voted in {x.voted} of {x.seats} seats you can vote for.</p>
      {!d && <Loading text="Loading seats..." />}
      {seats.map((p) => (
        <div key={p.id} className="space-y-2"><div className="flex items-center gap-2"><h3 className="font-bold text-white">{p.title}</h3>{forWho(p.eligible)}<span className="text-xs text-soft">{SEAT[p.status]}</span></div>
          <Tracker pid={p.id} voted={!!d.me?.voted?.[p.id]} closed={d.status === 'closed'} cands={p.candidates} /></div>
      ))}
    </div>
  );
}

function Results({ res }) {
  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-extrabold text-white">Final results</h2>
      {res.positions.map((p) => {
        const top = p.results[0]?.votes;
        return (
          <div key={p.id} className="panel space-y-4">
            <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-extrabold text-white">{p.title}</h3>{forWho(p.eligible)}</div>
              <p className="text-sm text-soft">{p.total} of {p.eligibleVoters} eligible registered voters voted{p.abstained > 0 && `, ${p.abstained} abstained`}. Ballot chain {p.valid ? 'verified' : 'FAILED verification'}.</p></div>
            {!p.results.length && <p className="text-soft">No approved candidates for this seat.</p>}
            {p.results.map((c) => (
              <div key={c.id} className="flex items-center gap-3">
                <Avatar src={c.photoUrl} name={c.name} size={44} />
                <div className="flex-1"><div className="flex justify-between text-sm font-bold"><span className="text-white">{c.name}{c.votes === top && top > 0 ? ' (leading)' : ''}</span><span>{c.votes} ({p.total ? Math.round((c.votes / p.total) * 100) : 0}%)</span></div>
                  <div className="mt-1 h-2 rounded bg-raise"><div className={`h-2 rounded ${c.votes === top ? 'bg-gold' : 'bg-brand'}`} style={{ width: `${p.total ? (c.votes / p.total) * 100 : 0}%` }} /></div></div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function Ledger({ pid, candidates }) {
  const [ledger, setLedger] = useState(null);
  const [q, setQ] = useState('');
  const [self, setSelf] = useState(null);
  useEffect(() => { api(`/positions/${pid}/ledger`).then(setLedger); }, [pid]);
  // once the election has closed the browser recomputes every hash itself
  useEffect(() => {
    if (!ledger?.closed) return;
    (async () => {
      let prev = '0'.repeat(64);
      for (const [i, b] of ledger.ballots.entries()) {
        if (b.index !== i || b.prevHash !== prev || (await sha256(`${b.index}|${b.position}|${b.candidateId}|${b.nonce}|${b.prevHash}`)) !== b.hash) return setSelf(false);
        prev = b.hash;
      }
      setSelf(true);
    })();
  }, [ledger]);
  if (!ledger) return <Loading text="Loading ledger..." />;
  const hit = q.trim().length === 64 ? ledger.ballots.find((b) => b.hash === q.trim().toLowerCase()) : null;
  return (
    <div className="space-y-3">
      <p className="text-sm text-soft">Each ballot is chained to the one before it, so changing or removing one breaks the chain. Server check: <b className={ledger.valid ? 'text-good' : 'text-bad'}>{ledger.valid ? 'intact' : 'BROKEN'}</b>.{ledger.closed && self !== null && <> Your browser's own recount: <b className={self ? 'text-good' : 'text-bad'}>{self ? 'intact' : 'BROKEN'}</b>.</>}</p>
      <input className="input font-mono" placeholder="Paste a receipt to find a ballot" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Receipt search" />
      {hit && <p className="text-sm font-bold text-good">Found: ballot #{hit.index + 1}{hit.candidateId && (hit.candidateId === 'abstain' ? ' (abstained)' : ` for ${candidates.find((c) => c.id === hit.candidateId)?.name || 'a candidate'}`)}.</p>}
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
