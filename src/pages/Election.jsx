import React, { useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { api, fmt, sha256, saveReceipt } from '../api.js';
import { Err, Badge, Avatar, Phases, Loading, Btn } from '../ui.jsx';
import { useAuth } from '../auth.jsx';
import { SEAT, forWho, canJoin } from '../shared.jsx';
import Tracker from './Tracker.jsx';

export default function Election() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();
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
  const location = useLocation();
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

      {!voting && !closed && <p className="rounded-lg border border-line bg-night/40 p-3 text-sm text-soft">Candidates for this seat are revealed here once voting opens.</p>}
      {receipt && <div className="rounded-xl border border-gold/60 p-4"><p className="font-extrabold text-gold">Your receipt for {p.title}</p><p className="mt-1 break-all font-mono text-xs">{receipt}</p><p className="mt-2 text-sm text-soft">It proves your ballot exists without showing your choice.</p></div>}
      {user && me?.registered && mine && <Tracker pid={p.id} voted={voted} closed={closed} cands={p.candidates} />}
      <details onToggle={(e) => setShowLedger(e.currentTarget.open)}>
        <summary className="cursor-pointer text-sm font-bold text-brand">Public ballot ledger for this seat</summary>
        {showLedger && <div className="mt-3"><Ledger pid={p.id} candidates={p.candidates} /></div>}
      </details>
    </section>
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
